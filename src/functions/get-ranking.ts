import { inArray } from 'drizzle-orm'
import { db } from '../drizzle/client'
import { subscriptions } from '../drizzle/schema/subscriptions'
import { redis } from '../redis/client'

export async function getRanking() {
  const ranking = await redis.zrevrange('referral:ranking', 0, 2, 'WITHSCORES')
  const subscriberIdAndScore: Record<string, number> = {}

  for (let i = 0; i < ranking.length; i += 2) {
    const subscriberId = ranking[i]
    const score = ranking[i + 1]

    subscriberIdAndScore[subscriberId] = Number(score)
  }

  const subscribers = await db
    .select()
    .from(subscriptions)
    .where(inArray(subscriptions.id, Object.keys(subscriberIdAndScore)))

  const rankingWithScore = subscribers
    .map(subcriber => {
      return {
        id: subcriber.id,
        name: subcriber.name,
        score: subscriberIdAndScore[subcriber.id],
      }
    })
    .sort((a, b) => b.score - a.score)

  return { rankingWithScore }
}
