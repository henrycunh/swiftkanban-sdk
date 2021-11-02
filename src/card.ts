import { AxiosInstance } from "axios"
import { SK } from "./client.js"
import { Board } from "./board.js"

export class Card {

    client: AxiosInstance
    board: Board

    // TODO: add inherited class to not rewrite this bullshit
    private internalBoardId: string | null = null
    private getBoardId = (boardId?: string) => {
        const id = boardId || this.internalBoardId
        if (id) {
            return id
        } else {
            throw new Error('No board ID provided.')
        }
    }

    constructor (client: AxiosInstance, boardId?: string) {
        this.client = client
        this.board = new Board(client)

        // TODO: add inherited class to not rewrite this bullshit
        if (boardId) {
            this.internalBoardId = boardId
        }
    }

    /**
     * Given a title, search for cards on a board
     * 
     * @param cardTitle Title of the card you're searching for
     * @param boardId ID of the board you're searching the card on
     * @returns List of cards matching the title
     */
    async search(cardTitle: string,  fields?: string[], filter?: { [key: string]: string }, boardId?: string) {
        // SK doesn't accept params ending with the `foo[]`
        // notation so I'm obliged to implement this bullshit
        const params = new URLSearchParams()
        for (const field of [...(fields || []), 'name', 'id', 'workType', 'cardNumber']) {
            params.append('fieldName', field)
        }
        const filterReduced = Object
            .entries({...filter} || {})
            .reduce((acc, [key, value]) => `${key}:{$eq:${value}},${acc}`, '')
            .concat(cardTitle ? `name:{$lkw:${cardTitle}}` : '')
        
        params.append('advanceFilter', filterReduced)
        const { data } = await SK.handleError(
            this.client.get(`/card-operations/boards/${this.getBoardId(boardId)}/cards`, {
                params
            }) as any
        )
        return data.Response.details.cardDetails
    }

    /**
     * Creates a card on a board, if given a lane, it will
     * move the card to the first queue available at that
     * lane
     * 
     * @param card Card properties setted upon creation
     * @param boardId ID of the board to create the card upon
     * @returns The data of the card created
     */
    async create(card: SKCreateCardOptions, boardId?: string) {
        const laneData = await this.board.laneList(this.getBoardId(boardId)) as any[]
        const lane = laneData.find(($lane: any) => $lane.name === card.lane)
        
        if (lane === undefined) {
            throw new Error(`No lane was found with the name ${card.lane}.`)
        }

        const { data: createData } = await SK.handleError(
            this.client.post(`/card-operations/boards/${this.getBoardId(boardId)}/cards`, {
                card: [{
                    workType: card.type,
                    name: card.title
                }]
            })
        )

        const cardData = createData.Response.details.cardDetails.shift().card

        const { id: cardId, workType: cardType } = cardData
        await this.ready(cardId, cardType, lane.id, lane.firstQueue.queueId, this.getBoardId(boardId))
        
        if (card.parent) {
            await this.linkParent(cardId, cardType, card.parent.id, card.parent.type, this.getBoardId(boardId))
        }

        return cardData
    }

    /**
     * Archives a card, given it's ID, Type and Board
     * 
     * @param cardId ID of the card to be archived
     * @param cardType Type of the card to be archived
     * @param boardId ID of the board of the card which will be archived
     * @returns The response from the SK API
     */
    async archive(cardId: string, cardType: string, boardId?: string) {
        const { data } = await SK.handleError(
            this.client.put(`/card-operations/boards/${this.getBoardId(boardId)}/cards/archive`, {
                cardDetails: [{ cardUniqueId: cardId, cardType }]
            })
        )
        return data
    }

    /**
     * Moves a card to a queue in a lane
     * 
     * @param cardId ID of the card to be moved
     * @param cardType Type of the card to be moved
     * @param laneId ID of the lane where card will be moved to
     * @param queueId ID of the queue where card will be moved to
     * @param boardId ID of the board of the card to be moved
     * @returns The response from the SK API
     */
    async ready (cardId: string, cardType: string, laneId: string, queueId: string, boardId?: string) {
        const { data } = await SK.handleError(
            this.client.put(`/card-operations/boards/${this.getBoardId(boardId)}/cards/move/ready`, {
                cardDetails: [{
                    cardType,
                    cardUniqueId: cardId,
                    swimId: laneId,
                    queueId
                }]
            })
        )
        return data
    }

    // TODO: document this function
    async move (cardId: string, cardType: string, laneId: string, queueId: string, boardId?: string) {
        const { data } = await SK.handleError(
            this.client.put(`/card-operations/boards/${this.getBoardId(boardId)}/cards/move/board`, {
                cardDetails: [{
                    cardType,
                    cardUniqueId: cardId,
                    toSwimId: laneId,
                    toQkeyId: queueId
                }]
            })
        )
        return data
    }

    // TODO: document this function
    async linkParent (cardId: string, cardType: string, parentCardId: string, parentCardType: string, boardId?: string) {
        const id = `${cardType}:${cardId}`
        const { data } = await SK.handleError(
            this.client.post(`/relation-operations/boards/${this.getBoardId(boardId)}/cards/${id}/relations`, {
                fromCard: [{
                    relation: 'Parent-child',
                    cardUniqueId: parentCardId,
                    cardType: parentCardType,
                    boardId
                }]
            })
        )
        return data
    }
}

export interface SKCreateCardOptions {
    title: string
    body?: string
    parent?: {
        id: string
        type: string
    }
    lane: string
    type: 'UserStory' | 'STK' | 'TST' | string
}