from exceptiongroup import catch
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoAlertPresentException
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.chrome.options import Options
import time
import os
import shutil
import json
import csv
import threading
import cv2
import random
import requests
import polling
import re
from flask import Flask, request, jsonify, Response, Blueprint
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import sqlite3
from datetime import datetime, timezone
from webdriver_manager.chrome import ChromeDriverManager
from .tasks import interprete_flows
from . import celery
from dotenv import load_dotenv

load_dotenv()

main = Blueprint('main', __name__)

CORS(main, supports_credentials=True)

@main.route('/api/domain_info', methods=['POST'])
def fetch_domains():
    # SQLite 연결
    conn = sqlite3.connect('thread_state.db')
    cursor = conn.cursor()
    
    # 'threads' 테이블에서 'domain' 값을 가져오는 SQL 쿼리
    query = "SELECT domain FROM threads"
    cursor.execute(query)
    
    # 결과를 모두 가져오기
    domains = cursor.fetchall()

    # SQLite 연결 종료
    conn.close()

    # 결과를 JSON 형식으로 반환
    # fetchall()은 [(domain1,), (domain2,), ...] 형식으로 튜플을 반환하므로 이를 처리하여 리스트로 반환
    domain_list = [domain[0] for domain in domains]

    return jsonify({'domains': domain_list}), 200

@main.route('/api/new_domain', methods=['POST'])
def make_new_domain():
    # 클라이언트에서 domain 정보를 받음
    data = request.get_json()  # POST 요청 본문에서 JSON 데이터를 받음
    domain = data.get('domain')
    
    if not domain:
        return jsonify({'error': 'Domain is required'}), 400  # 도메인이 없으면 오류 반환
    
    # SQLite 연결
    conn = sqlite3.connect('thread_state.db')
    cursor = conn.cursor()
    
    # 'threads' 테이블에서 이미 도메인이 존재하는지 확인
    cursor.execute("SELECT 1 FROM threads WHERE domain = ?", (domain,))
    existing_domain = cursor.fetchone()
    
    if existing_domain:
        conn.close()
        return jsonify({'error': f"Domain '{domain}' already exists"}), 400  # 도메인이 이미 존재하는 경우 에러 반환
    
    # 'threads' 테이블에 도메인 추가
    try:
        cursor.execute("INSERT INTO threads (domain, is_alive) VALUES (?, ?)", (domain, 0))
        conn.commit()
    except sqlite3.Error as e:
        conn.rollback()  # 오류 발생 시 롤백
        conn.close()
        return jsonify({'error': str(e)}), 500  # 데이터베이스 오류 발생 시 반환

    # SQLite 연결 종료
    conn.close()
    
    # configs 폴더 확인 후, 없으면 생성
    configs_folder = 'configs'
    if not os.path.exists(configs_folder):
        os.makedirs(configs_folder)
    
    # JSON 파일에 저장할 기본 구조
    default_json = {
            "urls": {
                "base_url": "",
            },
            "selectors": {
                "id_input": "",
                "pwd_input": "",
                "login_button": "",
                "search_input": "",
                "search_button": "",
            },
            "methods": [
                {
                    "type": "function",
                    "name": "visit",
                    "args": [
                        "['urls']['base_url']"
                    ]
                },
            ],
            "credentials": {
                "username": "",
                "password": ""
            },
        }
    
    # domain + '.json' 파일 경로
    file_path = os.path.join(configs_folder, f"{domain}.json")
    
    # JSON 파일 생성 및 기본 데이터 기록
    try:
        with open(file_path, 'w') as json_file:
            json.dump(default_json, json_file, indent=4)
    except IOError as e:
        return jsonify({'error': f"File creation failed: {str(e)}"}), 500
    
    # 성공적으로 도메인과 파일을 생성한 경우
    return jsonify({'message': f"Domain '{domain}' created successfully"}), 200

@main.route('/api/send_info', methods=['POST'])
def send_info():
    try:
        data = request.json

        domain = data.get("domain")

        with open('configs/'+ domain + '.json', 'r', encoding='utf-8') as file:
            data = json.load(file)
        
        return Response(json.dumps(data), mimetype='application/json')
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@main.route('/api/edit_method', methods=['POST'])
def edit_method():
    try:
        data = request.json

        domain = data.get("domain")
        download_method = data.get("method")

        with open('configs/'+ domain + '.json', 'r', encoding='utf-8') as file:
            data = json.load(file)
        
        data['methods'] = download_method
        
        with open('configs/'+ domain + '.json', 'w', encoding='utf-8') as file:
            json.dump(data, file, indent=4)

        return jsonify({"message": "File updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@main.route('/api/edit', methods=['POST'])
def edit_config():
    try:
        data = request.json

        domain = data.get("domain")
        base_url = data.get("base_url")

        with open('configs/'+ domain + '.json', 'r', encoding='utf-8') as file:
            data = json.load(file)
        
        data['urls']['base_url'] = base_url

        with open('configs/'+ domain + '.json', 'w', encoding='utf-8') as file:
            json.dump(data, file, indent=4)

        return jsonify({"message": "File updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@main.route('/api/edit_selectors', methods=['POST'])
def edit_selectors():
    try:
        data = request.json

        domain = data.get("domain")
        selectors = data.get("selectors")

        with open('configs/'+ domain + '.json', 'r', encoding='utf-8') as file:
            data = json.load(file)
        
        data['selectors'] = selectors
        
        with open('configs/'+ domain + '.json', 'w', encoding='utf-8') as file:
            json.dump(data, file, indent=4)

        return jsonify({"message": "File updated successfully", "data": data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def get_next_crawl_num():
    """
    error_info 테이블에서 crawl_num의 최대값을 찾아서 +1 한 값을 반환
    테이블이 비어있으면 1을 반환
    """
    try:
        conn = sqlite3.connect('thread_state.db')
        cursor = conn.cursor()

        cursor.execute("SELECT MAX(crawl_num) FROM error_info")
        result = cursor.fetchone()

        if result is None or result[0] is None:
            return 1
        else:
            return result[0] + 1

    except Exception as e:
        print(f"[Exception] {e}")
        return None
    finally:
        conn.close()

@main.route('/api/download', methods=['POST'])
def download_with_thread():
    conn = sqlite3.connect('thread_state.db')

    cursor = conn.cursor()
    data = request.json
    domain = data.get("domain")

    # 동일 task_id로 이미 스레드가 실행 중인지 확인
    cursor.execute('SELECT is_alive FROM threads WHERE domain = ?', (domain,))
    row = cursor.fetchone()

    if row is None:
        # 존재하지 않으면 새로 추가하고 is_alive를 TRUE로 설정
        cursor.execute('''
            INSERT INTO threads (domain, is_alive) VALUES (?, 1)
        ''', (domain,))
        conn.commit()
        conn.close()
    else:
        # 존재하면 is_alive가 FALSE인 경우만 TRUE로 업데이트
        if not row[0]:  # row[0]이 False인 경우만 업데이트
            num = 0
            cursor.execute('''
                UPDATE threads SET (is_alive, state) = (1, 'RUNNING') WHERE domain = ?
            ''', (domain,))
            conn.commit()
            cursor.execute("SELECT MAX(crawl_num) FROM error_info")
            result = cursor.fetchone()

            if result is None or result[0] is None:
                num = 1
            else:
                num = result[0] + 1
            conn.close()
            print(interprete_flows)
            task = interprete_flows.apply_async(args=(domain, num))
        else:
            conn.close()
            return jsonify({"message": "Task is already running", "task_id": domain}), 403

    # 변경 사항 커밋
    

    return jsonify({"message": "Task started", "task_id": task.id}), 202

@main.route('/task-status', methods=['POST'])
def get_task_status():
    conn = sqlite3.connect('thread_state.db')

    cursor = conn.cursor()
    data = request.json
    domain = data.get("domain")

    cursor.execute('SELECT * FROM threads WHERE domain = ?', (domain,))
    row = cursor.fetchone()

    if row is None:
        return jsonify({"error": "Domain not exists"}), 404
    try:
        return jsonify({ "status": row[4] }), 200
    except:
        return jsonify({ "error": "Unexpected Error" }), 500
    
@main.route('/download-status', methods=['POST'])
def get_download_status():
    conn = sqlite3.connect('thread_state.db')
    conn.row_factory = sqlite3.Row

    cursor = conn.cursor()
    data = request.json
    domain = data.get("domain")

    # error_info 와 threads를 조인하여 검색
    cursor.execute("""
        SELECT e.*
        FROM error_info e
        JOIN threads t ON e.domain_num = t.id
        WHERE t.domain = ?
    """, (domain,))

    rows = cursor.fetchall()
    result = [dict(row) for row in rows]

    if not rows:
        return jsonify({ "info": "No data with given domain" }), 204

    try:
        return jsonify({ "info": result }), 200
    except:
        return jsonify({ "error": "Unexpected Error" }), 500
    finally:
        conn.close()

@main.route('/api/stop_download', methods=['POST'])
def stop_download():
    conn = sqlite3.connect('thread_state.db')

    cursor = conn.cursor()
    data = request.json
    domain = data.get("domain")

    cursor.execute('SELECT * FROM threads WHERE domain = ?', (domain,))
    row = cursor.fetchone()

    print(row)

    if row is None:
        return jsonify({"error": "Task not exists"}), 404
    if not row[2]:
        return jsonify({"error": "Task not executed"}), 400
    task_status = row[4]
    print(task_status)
    
    # 이미 종료된 작업은 중단할 수 없습니다.
    if task_status in ['SUCCESS', 'FAILURE', 'REVOKED']:
        return jsonify({"error": "Task already finished or cancelled"}), 400
    
    cursor.execute('''
        UPDATE threads SET sig_kill = 1 WHERE domain = ?
    ''', (domain,))
    conn.commit()
    conn.close()
    
    return jsonify({"domain": domain, "status": "Task revoked"}), 200


# @main.route('/api/flow', methods=['POST'])
# def flow():
#     data = request.json
#     domain = data.get("domain")

#     add_script = False

#     with open('configs/'+ domain + '.json', 'r', encoding='utf-8') as file:
#         data = json.load(file)

#     pcid = data['crawling_info']['pcid']
#     ip = data['crawling_info']['ip']
#     script = True
#     if script is None:
#         add_script = True
#     args = {
#         "pcId": pcid,
#         "ip": ip
#     }
#     response = requests.post("http://teslasystem.asuscomm.com:12013/api/Crawling/Auto/Meta", json=args)
#     if not response.status_code == 200 or response.status_code == 201:
#         return jsonify({"error", "Error occured while getting response from Meta with code "+str(response.status_code)}), 400
    
#     response_data = response.json()
#     seq = response_data['crawlingSiteSeq']
    
#     data['urls']['base_url'] = response_data['siteURL']
#     data['urls']['content_page'] = response_data['contentURL']

#     data['credentials']['username'] = response_data['loginId']
#     data['credentials']['password'] = response_data['loginPW']

#     data['crawling_info']['webhardSeq'] = response_data['crawlingSite']['webhardSeq']
#     data['crawling_info']['crawlingPCSeq'] = response_data['crawlingPCSeq']
#     data['crawling_info']['crawlingMetaSeq'] = response_data['seq']
    
#     with open('configs/'+ domain + '.json', 'w', encoding='utf-8') as file:
#         json.dump(data, file, indent=4)

#     if add_script:
#         def load_config(file_path):
#             with open(file_path, 'r', encoding='utf-8') as f:
#                 return json.dumps(f)
#         config = load_config('configs/'+ domain + '.json')
#         args = {
#             "pcId": pcid,
#             "ip": ip,
#             "seq": seq,
#             "script": config
#         }
#         response = requests.put('http://teslasystem.asuscomm.com:12013/api/Crawling/Auto/Script', json=args)
#         if not response.status_code == 200:
#             return jsonify({"error", "Error occured while editing script from Meta with code "+str(response.status_code)}), 400

#     # datetime 객체 생성 (UTC 시간대 명시)
#     date_object = datetime.now(timezone.utc)

#     # ISO 8601 형식으로 변환 (Z 표기법 사용)
#     date_string = date_object.isoformat().replace("+00:00", "Z")
#     args = {
#         "pcId": pcid,
#         "ip": ip,
#         "queryDate": date_string,
#     }
#     response = requests.post('http://teslasystem.asuscomm.com:12013/api/Crawling/Auto/Schedule', json=args)
#     if not response.status_code == 200:
#         return jsonify({"error", "Error occured while getting schedule with code "+str(response.status_code)}), 400
#     response_data = response.json()
#     def req_lambda():
#         date_object = datetime.now(timezone.utc)

#         # ISO 8601 형식으로 변환 (Z 표기법 사용)
#         date_string = date_object.isoformat().replace("+00:00", "Z")
#         args = {
#             "pcId": pcid,
#             "ip": ip,
#             "queryDate": date_string,
#         }
#         response = requests.post('http://teslasystem.asuscomm.com:12013/api/Crawling/Auto/Schedule', json=args)
#         if not response.status_code == 200:
#             return False
        
#         return response_data['isActivate']
#     if not response_data['isActivate']:
#         polling.poll(
#             lambda: req_lambda(),
#             step=300,
#             poll_forever=True
#         )
    
#     conn = sqlite3.connect('thread_state.db')

#     cursor = conn.cursor()

#     # 동일 task_id로 이미 스레드가 실행 중인지 확인
#     cursor.execute('SELECT is_alive FROM threads WHERE domain = ?', (domain,))
#     row = cursor.fetchone()

#     if row is None:
#         # 존재하지 않으면 새로 추가하고 is_alive를 TRUE로 설정
#         cursor.execute('''
#             INSERT INTO threads (domain, is_alive) VALUES (?, 1)
#         ''', (domain,))
#         conn.commit()
#         conn.close()
#     else:
#         # 존재하면 is_alive가 FALSE인 경우만 TRUE로 업데이트
#         if not row[0]:  # row[0]이 False인 경우만 업데이트
#             cursor.execute('''
#                 UPDATE threads SET (is_alive, state) = (1, 'RUNNING') WHERE domain = ?
#             ''', (domain,))
#             conn.commit()
#             conn.close()
#             print(interprete_flows)
#             task = interprete_flows.apply_async(args=(domain,))
#         else:
#             conn.close()
#             print("NOOO")
#             return jsonify({"message": "Task is already running", "task_id": domain}), 403

#     # 변경 사항 커밋
#     return jsonify({"message": "Task started", "task_id": task.id}), 202