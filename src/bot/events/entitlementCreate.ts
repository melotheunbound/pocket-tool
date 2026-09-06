import { GatewayDispatchEvents } from '@discordjs/core'
import createGatewayEvent from '../../builders/event'

createGatewayEvent({
  event: GatewayDispatchEvents.EntitlementCreate,
  async run(entitlement, client) {
    if (entitlement.sku_id === '1538163894256930917') {
      await client.api.channels.createMessage('1533439027657572435', {
        content: `<@${entitlement.user_id}> has just purchased the premium subscription!`,
      })

      const member = await client.api.guilds.getMember('1533439024637939792', entitlement.user_id!).catch(() => null)

      if (member)
        await client.api.guilds.addRoleToMember('1533439024637939792', entitlement.user_id!, '1538175871985127495')
    }
  },
})
