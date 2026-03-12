import { prisma } from './src/lib/prisma'

async function test() {
  console.log(prisma)
  const history = await prisma.priceHistory.findMany({ take: 1 })
  console.log(history)
}

test()
