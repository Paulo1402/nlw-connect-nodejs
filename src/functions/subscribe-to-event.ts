import { eq } from 'drizzle-orm'
import { db } from '../drizzle/client'
import { subscriptions } from '../drizzle/schema/subscriptions'
import { redis } from '../redis/client'

interface SubscribeToEventParams {
  name: string
  email: string
  referrerId?: string | null
}

export async function subscribeToEvent({
  name,
  email,
  referrerId,
}: SubscribeToEventParams) {
  const subscribers = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.email, email))

  if (subscribers.length > 0) {
    return {
      subscriberId: subscribers[0].id,
    }
  }

  const result = await db
    .insert(subscriptions)
    .values({
      name,
      email,
    })
    .returning()

  if (await isValidReferrerId(referrerId)) {
    await redis.zincrby('referral:ranking', 1, referrerId as string)
  }

  const subscriber = result[0]

  return {
    subscriberId: subscriber.id,
  }
}

async function isValidReferrerId(
  referrerId: string | null | undefined
): Promise<boolean> {
  if (!referrerId) {
    return false
  }

  try {
    const subscribers = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, referrerId))

    return subscribers.length > 0
  } catch {
    return false
  }
}
