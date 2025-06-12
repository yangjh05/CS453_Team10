# websocket_server.py

import asyncio
import websockets
import json
from collections import defaultdict

# 연결된 클라이언트들 저장 (도메인별)
clients = defaultdict(set)

async def handler(websocket, path="ws://0.0.0.0:8000"):
    """
    클라이언트와의 연결을 처리하는 코루틴
    """
    try:
        # 최초 연결 시 클라이언트가 자신의 도메인을 전송해야 함
        msg = await websocket.recv()
        init_data = json.loads(msg)
        domain = init_data.get("domain")
        if not domain:
            await websocket.send(json.dumps({"error": "Domain not specified"}))
            return

        # 도메인 그룹에 클라이언트 등록
        # if len(clients[domain]) >= 1:
        #     await websocket.send(json.dumps({"error": "Domain already exists"}))
        #     return
        clients[domain].add(websocket)
        print(f"[+] Connected: {domain}, Total clients: {len(clients[domain])}")

        # 무한 루프로 keepalive (혹은 추후 ping/pong 구현 가능)
        while True:
            await asyncio.sleep(60)

    except websockets.exceptions.ConnectionClosed:
        print("[!] Connection Closed")
    finally:
        # 연결 종료 시 클라이언트 제거
        for domain_set in clients.values():
            domain_set.discard(websocket)
        print("[-] Client disconnected")

async def broadcast_to_domain(domain, data):
    """
    특정 도메인 그룹에만 메시지를 전송
    """
    targets = clients.get(domain, set())
    if not targets:
        print(f"[!] No clients for domain: {domain}")
        return

    message = json.dumps(data)
    dead_clients = set()

    for client in targets:
        try:
            await client.send(message)
        except websockets.exceptions.ConnectionClosed:
            dead_clients.add(client)

    # 연결이 끊긴 클라이언트 제거
    targets.difference_update(dead_clients)

async def start_server_async():
    """
    WebSocket 서버 시작
    """
    server = await websockets.serve(handler, "0.0.0.0", 8000)
    print("[*] WebSocket server started at ws://0.0.0.0:8000")
    await server.wait_closed()

def start_server():
    """
    동기식으로 호출할 수 있도록 asyncio 이벤트 루프 실행
    """
    asyncio.run(start_server_async())