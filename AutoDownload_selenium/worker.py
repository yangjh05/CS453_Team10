# worker.py

from app import celery

if __name__ == '__main__':
    celery.worker_main()