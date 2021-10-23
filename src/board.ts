import { AxiosInstance } from "axios"
import { SK } from "./client.js"

export class Board {

    client: AxiosInstance

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

        // TODO: add inherited class to not rewrite this bullshit
        if (boardId) {
            this.internalBoardId = boardId
        }
    }

    /**
     * Fetches the lanes from a board, given it's ID
     * 
     * @param boardId ID of the board containing the lanes
     * @returns A list of lanes in that board
     */
    async laneList(boardId?: string) {
        const { data } = await SK.handleError(
            this.client.get(`board-operations/boards/${this.getBoardId(boardId)}/lanes`)
        )
        return data.Response.details.swimLane.map((lane: any) => ({
            name: lane.laneName,
            id: lane.laneId,
            queueList: lane.queue,
            firstQueue: [...lane.queue].shift()
        }))
    }
    
}