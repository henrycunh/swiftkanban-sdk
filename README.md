# SwiftKanban SDK
A really simple SwiftKanban SDK (for those dire corporate environments)

## Usage
```ts
import SK from 'swiftkanban-sdk'

const client = new SK({
    token: 'XXXX-XXX',
    host: 'example.swiftkanban.com/restapi'
})

const cardList = await client.searchCard('foo bar card', '<boardId>') 
```