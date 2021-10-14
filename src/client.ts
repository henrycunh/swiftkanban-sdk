import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { inspect } from 'util'

export class SK {
    
    private client: AxiosInstance

    constructor (options: { token: string, host: string }) {
        this.client = axios.create({
            baseURL: options.token,
            headers: {
                AuthorizationToken: options.token
            }
        })
    }

    /**
     * Given a title, search for cards on a board
     * 
     * @param cardTitle Title of the card you're searching for
     * @param boardId ID of the board you're searching the card on
     * @returns List of cards matching the title
     */
    async searchCard(cardTitle: string, boardId: string) {
        // SK doesn't accept params ending with the `foo[]`
        // notation so I'm obliged to implement this bullshit
        const params = new URLSearchParams()
        for (const field of ['name', 'id', 'workType']) {
            params.append('fieldName', field)
        }
        params.append('advanceFilter', `name:{$lkw:${cardTitle}}`)

        const { data } = await this.client.get(`/card-operations/boards/${boardId}/cards`, {
            params
        }) as any
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
    async createCard(card: SKCreateCardOptions, boardId: string) {
        const laneData = await this.getBoardLaneList(boardId) as any[]
        const lane = laneData.find(($lane: any) => $lane.name === card.lane)
        
        if (lane === undefined) {
            throw new Error(`No lane was found with the name ${card.lane}.`)
        }

        const { data: createData } = await SK.handleError(
            this.client.post(`/card-operations/boards/${boardId}/cards`, {
                card: [{
                    workType: card.type,
                    name: card.title
                }]
            })
        )

        const cardData = createData.Response.details.cardDetails.shift().card

        const { id: cardId, workType: cardType } = cardData
        await this.moveCard(cardId, cardType, lane.id, lane.firstQueue.queueId, boardId)
        
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
    async archiveCard(cardId: string, cardType: string, boardId: string) {
        const { data } = await SK.handleError(
            this.client.put(`/card-operations/boards/${boardId}/cards/archive`, {
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
    async moveCard (cardId: string, cardType: string, laneId: string, queueId: string, boardId: string) {
        const { data } = await SK.handleError(
            this.client.put(`/card-operations/boards/${boardId}/cards/move/ready`, {
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

    /**
     * Fetches the lanes from a board, given it's ID
     * 
     * @param boardId ID of the board containing the lanes
     * @returns A list of lanes in that board
     */
    async getBoardLaneList(boardId: string) {
        const { data } = await SK.handleError(
            this.client.get(`board-operations/boards/${boardId}/lanes`)
        )
        return data.Response.details.swimLane.map((lane: any) => ({
            name: lane.laneName,
            id: lane.laneId,
            queueList: lane.queue,
            firstQueue: lane.queue.shift()
        }))
    }

    private static async handleError(request: Promise<any>): Promise<AxiosResponse<any> | { data: null }>{
        try {
            const response = await request
            return response
        } catch (e: any) {
            console.log(e.message, inspect(e.response.data.Response, false, null, true))
            return { data: null }
        }
    }

}

export interface SKCreateCardOptions {
    title: string
    body?: string
    parentId?: string
    lane: string
    type: 'UserStory' | 'STK' | 'TST' | string
}