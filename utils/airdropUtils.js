const { request, gql } = require('graphql-request')

const subgraphEndpoint = 'https://api.thegraph.com/subgraphs/name/ethemerals/ethemerals'
const query = gql`
    {
        ethemerals(first: 1000) {
            owner {
                id
            }
        }
    }`

async function getOwnerAddresses() {
    const data = await request(subgraphEndpoint, query)

    return data.ethemerals.map(meral => {
        return meral.owner.id;
    });
}

function chunk(items, size) {
    const chunks = []
    items = [].concat(...items)

    while (items.length) {
        chunks.push(
            items.splice(0, size)
        )
    }

    return chunks
}

function occuranceCount(array) {
    const counts = {};

    for (const num of array) {
        counts[num] = counts[num] ? counts[num] + 1 : 1;
    }

    return counts;
}

module.exports = { getOwnerAddresses, chunk, occuranceCount };

