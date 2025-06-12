from app import app
from socketapp import start_server
import threading

if __name__ == '__main__':
    # 소켓 서버 시작 (별도 스레드로 실행)
    socket_thread = threading.Thread(target=start_server)
    socket_thread.daemon = True  # 메인 스레드가 종료되면 같이 종료되도록 설정
    socket_thread.start()
    
    # Flask 앱 실행
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)