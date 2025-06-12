# app/__init__.py

import os
from flask import Flask
from flask_cors import CORS
from celery import Celery
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

def make_celery(app):
    # Celery 초기화
    celery = Celery(
        app.import_name,
        broker=os.getenv('CLOUDAMQP_URL'),
    )
    celery.conf.update(app.config)
    
    # Flask 애플리케이션 컨텍스트를 Celery 작업에 전달
    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)
    
    celery.Task = ContextTask
    return celery

# Flask 애플리케이션 초기화
app = Flask(__name__)
CORS(app, supports_credentials=True)

# Celery 객체 생성
celery = make_celery(app)

# 라우트 등록 (celery가 먼저 초기화되도록 순서 중요)
from .routes import main as main_blueprint
app.register_blueprint(main_blueprint)
