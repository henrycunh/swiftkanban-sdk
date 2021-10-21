import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { inspect } from 'util'
import { Board } from './board.js'
import { Card } from './card.js'

export class SK {
    
    private client: AxiosInstance
    private boardId: string | null = null

    card: Card
    board: Board

    constructor (options: { token: string, host: string, boardId?: string }) {
        this.client = axios.create({
            baseURL: options.host,
            headers: {
                AuthorizationToken: options.token
            }
        })
        this.card = new Card(this.client, options.boardId)
        this.board = new Board(this.client, options.boardId)
    }

    static async handleError(request: Promise<any>): Promise<AxiosResponse<any> | { data: null }>{
        try {
            const response = await request
            return response
        } catch (e: any) {
            console.log(e.message, inspect(e.response.data.Response, false, null, true))
            return { data: null }
        }
    }

}
