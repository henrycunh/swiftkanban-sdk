# SwiftKanban SDK
A really simple SwiftKanban SDK (for those dire corporate environments)

## Usage
```ts
import SK from 'swiftkanban-sdk'

const client = new SK({
    token: 'XXXX-XXX',
    host: 'https://example.swiftkanban.com/restapi',
    boardId: 'XXXX' // this is optional, you could pass the boardId through arguments in any method
})

const cardList = await client.card.search('foo bar card')
```
