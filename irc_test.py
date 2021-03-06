import asyncio

from asyncirc.protocol import IrcProtocol
from asyncirc.server import Server

loop = asyncio.get_event_loop()

servers = [
    Server("irc.example.org", 6697, True),
    Server("irc.example.com", 6667),
]

async def log(conn, message):
    print(message)

async def main():
    conn = IrcProtocol(servers, "BotNick", loop=loop)
    conn.register_cap('userhost-in-names')
    conn.register('*', log)
    await conn.connect()
    await asyncio.sleep(24 * 60 * 60)

try:
    loop.run_until_complete(main())
finally:
    loop.stop()