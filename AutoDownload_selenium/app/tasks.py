from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoAlertPresentException
from selenium.webdriver.chrome.options import Options
import time
import os
import json
import sqlite3
from webdriver_manager.chrome import ChromeDriverManager
from dotenv import load_dotenv
import pusher
from . import celery
from functools import wraps
from selenium.common.exceptions import (
    WebDriverException,
    TimeoutException,
    NoSuchElementException,
    ElementClickInterceptedException,
    StaleElementReferenceException,
    SessionNotCreatedException,
    InvalidSessionIdException
)
from selenium.webdriver.remote.webdriver import WebDriver
from functools import wraps
import traceback
import logging
import time

load_dotenv()

# Pusher 클라이언트 초기화
pusher_client = pusher.Pusher(
    app_id=os.getenv('PUSHER_APP_ID'),
    key=os.getenv('PUSHER_KEY'),
    secret=os.getenv('PUSHER_SECRET'),
    cluster=os.getenv('PUSHER_CLUSTER'),
    ssl=True
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('crawler_errors.log'),
        logging.StreamHandler()
    ]
)

def handle_selenium_errors(max_retries=0, retry_delay=5):
    """
    A decorator to handle Selenium WebDriver errors with retry mechanism
    
    Args:
        max_retries (int): Maximum number of retry attempts
        retry_delay (int): Delay between retries in seconds
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            retries = 0
            domain = args[1] if args else kwargs.get('domain')
            
            while retries < max_retries:
                try:
                    return func(*args, **kwargs)
                
                except SessionNotCreatedException as e:
                    logging.error(f"Failed to create new session: {str(e)}")
                    change_state(domain, "FAILURE")
                    raise  # Critical error, don't retry
                
                except InvalidSessionIdException as e:
                    logging.error(f"Invalid session ID: {str(e)}")
                    change_state(domain, "FAILURE")
                    raise  # Critical error, don't retry
                
                except TimeoutException as e:
                    logging.warning(f"Timeout occurred: {str(e)}")
                    if retries == max_retries - 1:
                        change_state(domain, "FAILURE")
                        raise
                    
                except ElementClickInterceptedException as e:
                    logging.warning(f"Element click was intercepted: {str(e)}")
                    try:
                        driver = get_driver_from_args(args)
                        if driver:
                            # Try to scroll the element into view
                            element = driver.switch_to.active_element
                            driver.execute_script("arguments[0].scrollIntoView(true);", element)
                    except Exception:
                        pass
                
                except StaleElementReferenceException as e:
                    logging.warning(f"Stale element reference: {str(e)}")
                    # Allow retry for stale elements
                
                except NoSuchElementException as e:
                    logging.warning(f"Element not found: {str(e)}")
                    if retries == max_retries - 1:
                        change_state(domain, "FAILURE")
                        raise
                
                except WebDriverException as e:
                    logging.error(f"WebDriver error: {str(e)}")
                    try:
                        driver = get_driver_from_args(args)
                        if driver:
                            # Take screenshot on WebDriver errors
                            timestamp = time.strftime("%Y%m%d-%H%M%S")
                            screenshot_path = f"error_screenshots/{timestamp}_{domain}.png"
                            driver.save_screenshot(screenshot_path)
                            logging.info(f"Error screenshot saved: {screenshot_path}")
                    except Exception as screenshot_error:
                        logging.error(f"Failed to save error screenshot: {str(screenshot_error)}")
                    
                    if retries == max_retries - 1:
                        change_state(domain, "FAILURE")
                        raise
                
                except Exception as e:
                    logging.error(f"Unexpected error: {str(e)}\n{traceback.format_exc()}")
                    change_state(domain, "FAILURE")
                    raise  # Re-raise unknown exceptions
                
                retries += 1
                if retries < max_retries:
                    logging.info(f"Retrying... Attempt {retries + 1} of {max_retries}")
                    time.sleep(retry_delay)
            
            return None
        return wrapper
    return decorator

def get_driver_from_args(args):
    """
    Helper function to extract WebDriver instance from function arguments
    """
    for arg in args:
        if isinstance(arg, WebDriver):
            return arg
    return None

@celery.task(bind=True, name='app.tasks.interprete_flows')
@handle_selenium_errors(max_retries=1, retry_delay=5)
def interprete_flows(self, domain, num):
    change_state(domain, "RUNNING")
    log_error(domain, num, 1, f"Num {num}, Task {domain} has started running.")

    try:
        def load_config(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        service = Service(ChromeDriverManager().install())
        chrome_options = Options()
            # Add error handling related Chrome options
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--ignore-certificate-errors')
        chrome_options.add_argument('--start-maximized')

        driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.set_page_load_timeout(60)  # Set page load timeout

        config = load_config('configs/'+ domain + '.json')

        methods = config.get("methods", [])

        def wait_until_ready():
            while True:
                try:
                    alert = driver.switch_to.alert  # 경고창을 감지하려 시도
                    alert_text = alert.text  # 경고창의 텍스트를 가져옴 (경고창이 있다면)
                    print(f"Alert detected: {alert_text}")
                    break  # 경고창이 나타났다면 루프 종료
                except NoAlertPresentException:
                    # 경고창이 없으면 예외가 발생하므로 계속 진행
                    pass
                if driver.execute_script("return document.readyState") == "complete":
                    break
                time.sleep(0.5)
            time.sleep(2)
        
        def resolve_argument(arg, isFor=-1):
            """
            Resolve an argument based on its type.
            Args:
                arg: The argument to resolve.
                isFor: Current loop index if within for_with_cnt; otherwise, -1.
            Returns:
                The resolved value of the argument.
            """
            # Case 1: JSON-style key reference ['???']*n
            if isinstance(arg, str) and arg.startswith("['") and arg.endswith("']"):
                keys = arg[2:-2].split("']['")
                value = config  # Start from the JSON config
                for key in keys:
                    value = value.get(key, None)
                    if value is None:
                        change_state(domain, "FAILURE")
                        log_error(domain, num, 3, f"Key '{key}' not found in JSON configuration.")
                        raise ValueError(f"Key '{key}' not found in JSON configuration.")
                if len(value) == 0:
                    return ""
                if value[0].isdigit():
                    return int(value)
                return value

            # Case 2: Variable with indexing ???[i]
            if isinstance(arg, str) and '[' in arg and ']' in arg:
                base_var, index = arg.split('[')
                index = index.strip(']')
                base_var = base_var.strip()

                if not index.isdigit():
                    if isFor == -1:
                        change_state(domain, "FAILURE")
                        log_error(domain, num, 3, f"Index '{index}' is not valid outside for_with_cnt context.")
                        raise ValueError(f"Index '{index}' is not valid outside for_with_cnt context.")
                    index = isFor  # Use the current loop index if isFor is provided

                # Check if the base_var exists in the current scope
                if base_var in globals():
                    value = globals()[base_var]
                elif base_var in locals():
                    value = locals()[base_var]
                else:
                    change_state(domain, "FAILURE")
                    log_error(domain, num, 3, f"Variable '{base_var}' is not defined.")
                    raise ValueError(f"Variable '{base_var}' is not defined.")

                # Ensure value is indexable
                if isinstance(value, list) and int(index) < len(value):
                    return value[int(index)]
                else:
                    change_state(domain, "FAILURE")
                    log_error(domain, num, 3, f"Index {index} is out of range for variable '{base_var}'.")
                    raise IndexError(f"Index {index} is out of range for variable '{base_var}'.")

            # Case 3: Variable ??? (not starting with a number)
            if isinstance(arg, str) and not arg[0].isdigit():
                if arg == "popup":
                    return "popup"
                if arg in globals():
                    return globals()[arg]
                elif arg in locals():
                    return locals()[arg]
                elif arg[0] == "\"" and arg[-1] == "\"":
                    return arg[1:-1]
                else:
                    change_state(domain, "FAILURE")
                    log_error(domain, num, 3, f"Variable '{arg}' is not defined.")
                    raise ValueError(f"Variable '{arg}' is not defined.")

            # Case 4: Numeric string
            if isinstance(arg, str) and arg[0].isdigit():
                try:
                    if '.' in arg:  # Float
                        return float(arg)
                    return int(arg)  # Integer
                except ValueError:
                    change_state(domain, "FAILURE")
                    log_error(domain, num, 3, f"Invalid numeric string '{arg}'.")
                    raise ValueError(f"Invalid numeric string '{arg}'.")

            # Default: Return the argument as-is
            return

        def execute_command(command, isFor = -1):
            """Execute a single command based on its type and name."""
            if not isinstance(command, dict):
                return resolve_argument(command, isFor)
            command_type = command.get("type")
            command_name = command.get("name")
            args = command.get("args", [])
            

            if command_type == "function":
                resolved_args = [resolve_argument(arg, isFor) for arg in args]
                log_error(domain, num, 1, f"Executing function {method["name"]}")
                if command_name == "visit":
                    if not isinstance(resolved_args[0], str):
                        change_state(domain, "FAILURE")
                        log_error(domain, num, 3, f"Can't visit non-string link: {resolved_args[0]}")
                    driver.get(resolved_args[0])
                    # driver.maximize_window()
                elif command_name == "click":
                    if isinstance(resolved_args[0], str) and resolved_args[0].startswith('/') :
                        try:
                            element = WebDriverWait(driver, 3).until(EC.presence_of_element_located((By.XPATH, resolved_args[0])))
                            element.click()
                        except:
                            change_state(domain, "FAILURE")
                            log_error(domain, num, 3, f"Can't click: {resolved_args[0]}")
                            raise
                    else:
                        print(resolved_args[0])
                        try:
                            resolved_args[0].click()
                        except:
                            change_state(domain, "FAILURE")
                            log_error(domain, num, 3, f"Can't click: {resolved_args[0]}")
                            raise
                elif command_name == "enter":
                    try:
                        if isinstance(resolved_args[1], str) and resolved_args[1].startswith('/'):
                            element = WebDriverWait(driver, 10).until(
                                EC.presence_of_element_located((By.XPATH, resolved_args[1]))
                            )
                        else:
                            element = resolved_args[1]
                        print(element)
                        element.clear()
                        element.send_keys(resolved_args[0])
                    except:
                        change_state(domain, "FAILURE")
                        log_error(domain, num, 3, f"Can't enter: {resolved_args[1]}")
                        raise
                elif command_name == "handle_alert":
                    try:
                        WebDriverWait(driver, 10).until(EC.alert_is_present())
                        alert = driver.switch_to.alert
                        alert.accept()
                    except:
                        log_error(domain, num, 2, "No alert present.")
                        print("No alert present.")
                elif command_name == "handle_popup":
                    window_handles = driver.window_handles

                    if len(window_handles) == 1:
                        log_error(domain, num, 2, "No popup present.")
                        print("No popup present.")
                        return
                    # 원래 창을 제외한 팝업을 닫기
                    for handle in window_handles:
                        if handle != driver.window_handles[0]:
                            driver.switch_to.window(handle)  # 팝업 창으로 전환
                            driver.close()  # 팝업 창 닫기

                    # 원래 창으로 돌아가기
                    driver.switch_to.window(driver.window_handles[0])
                    print(driver.title)
                elif command_name == "switch_popup":
                    if len(window_handles) == 1:
                        log_error(domain, num, 3, "Can't switch to popup; popup doesn't exist.")
                        print("No popup present.")
                        raise
                    driver.switch_to.window(driver.window_handles[1])
                    print(driver.title)
                elif command_name == "switch_to":
                    if isinstance(resolved_args[0], str) and resolved_args[0].startswith('/'):
                        element = WebDriverWait(driver, 10).until(
                            EC.presence_of_element_located((By.XPATH, resolved_args[0]))
                        )
                    else:
                        element = resolved_args[0]
                    try:
                        driver.switch_to.frame(element)
                    except:
                        change_state(domain, "FAILURE")
                        log_error(domain, num, 3, f"Can't switch to frmae: {element}")
                        raise
                elif command_name == "come_back":
                    driver.switch_to.default_content()    
                elif command_name == "wait_and_click":
                    # Wait for the element to become clickable and then click it
                    try:
                        element = WebDriverWait(driver, int(resolved_args[1])).until(
                            EC.element_to_be_clickable((By.XPATH, resolved_args[0]))
                        )
                        element.click()
                    except TimeoutException as e:
                        change_state(domain, "FAILURE")
                        log_error(domain, num, 3, f"Timeout occured")
                        raise RuntimeError(f"Failed to wait and click on the element: {e}")
                    except:
                        change_state(domain, "FAILURE")
                        log_error(domain, num, 3, f"Failed to wait and click on the element")
                        raise RuntimeError(f"Failed to wait and click on the element: {e}")
                elif command_name == "len":
                    # Return the length of a resolved list
                    print(resolved_args[0])
                    if not isinstance(resolved_args[0], (str, list, dict)):
                        change_state(domain, "FAILURE")
                        log_error(domain, num, 3, f"Element {e} is not a measureable element")
                        raise
                    return len(resolved_args[0])
                elif command_name == "wait_until_list":
                    # Wait for elements to appear on the page
                    try:
                        return WebDriverWait(driver, int(resolved_args[1])).until(
                            EC.presence_of_all_elements_located((By.XPATH, resolved_args[0]))
                        )
                    except:
                        change_state(domain, "FAILURE")
                        log_error(domain, num, 3, f"Timeout occured")
                        raise
                elif command_name == "find_list":
                    # Find a list of elements
                    return driver.find_elements(By.XPATH, resolved_args[0])
                elif command_name == "texts_in_list":
                    # Extract text from a list of elements
                    return [element.text for element in resolved_args[0]]
                elif command_name == "find":
                    # Find a single element
                    return driver.find_element(By.XPATH, resolved_args[0])
                else:
                    print(f"Unknown function: {command_name}")
            elif command_type == "def":
                # Define variables in local scope
                if not isinstance(command.get("initial"), str):
                    globals()[command.get("name")] = execute_command(command.get("initial"), isFor)
                else:
                    globals()[command.get("name")] = resolve_argument(command.get("initial"), isFor)
            elif command_type == "if":
                condition = command.get("condition")
                # Evaluate condition dynamically based on its type
                if execute_command(condition):
                    for sub_command in command.get("body", []):
                        print(sub_command   ["type"])
                        ret = execute_command(sub_command, isFor)
                        if ret == -1:
                            return -1
                        if ret == 'revoked':
                            return ret
                        if wait_until_ready() == 0:
                            break
            elif command_type == "while":
                condition = command.get("condition")
                while execute_command(condition):
                    for sub_command in command.get("body", []):
                        print(sub_command["type"])
                        ret = execute_command(sub_command, isFor)
                        if ret == 'revoked':
                            return ret
                        if ret == -2:
                            continue
                        if ret == -1:
                            return -1
                        if wait_until_ready() == 0:
                            break
            elif command_type == "for_with_cnt":
                for i, var in enumerate(execute_command(command.get("list"))):
                    globals()[command["var"]] = var
                    for sub_command in command.get("body", []):
                        print(sub_command["type"])
                        ret = execute_command(sub_command, i)
                        if ret is not None:
                            print("ret: " + str(ret))
                        else:
                            print("ret is none")
                        if ret == -2:
                            continue
                        if ret == -1:
                            return -1
                        if ret == 'revoked':
                            return ret
                        wait_until_ready()
                    if i >= 5:
                        break #Debugggggggggggggggggggggggggggggg
            elif command_type == "try_except":
                try:
                    for sub_command in command.get("try", []):
                        print(sub_command["type"])
                        ret = execute_command(sub_command, isFor)
                        if ret == -1:
                            return -1
                        wait_until_ready()
                except:
                    for sub_command in command.get("except", []):
                        print(sub_command["type"])
                        ret = execute_command(sub_command, isFor)
                        if ret == -1:
                            return -1
                        wait_until_ready()
            elif command_type == "pass":
                pass
            elif command_type == "return":
                return -1
            elif command_type == "dec":
                globals()[command.get("var")] -= 1
                print("val")
                print(globals()[command.get("var")])
            elif command_type == "eq":
                print(execute_command(command["arg0"], isFor))
                print(execute_command(command["arg1"], isFor))
                return execute_command(command["arg0"], isFor) == execute_command(command["arg1"], isFor)
            elif command_type == "gt":
                return execute_command(command["arg0"], isFor) > execute_command(command["arg1"], isFor)
            else:
                print(f"Unknown command type: {command_type}")

        for method in methods:
            ret = execute_command(method)
            if check_stop(domain):
                print(f"Module {domain} is revoked.")
                change_state(domain, "REVOKED")
                log_error(domain, num, 1, f"Num {num}, Task {domain} has revoked.")
                return f"Task {domain} revoked.", -1
            if ret == 'revoked':
                print(f"Module {domain} is revoked.")
                change_state(domain, "REVOKED")
                log_error(domain, num, 1, f"Num {num}, Task {domain} has revoked.")
                driver.quit()
                return f"Task {domain} revoked.", -1
            if ret == -1:
                change_state(domain, "SUCCESS")
                log_error(domain, num, 1, f"Num {num}, Task {domain} has successfully returned.")
                return f"Task {domain} returned.", 0
            wait_until_ready()
        change_state(domain, "SUCCESS")
        log_error(domain, num, 1, f"Num {num}, Task {domain} has successfully returned.")

    except Exception as e:
        logging.error(f"Error in interprete_flows: {str(e)}\n{traceback.format_exc()}")
        change_state(domain, "FAILURE")
        log_error(domain, num, 3, f"Error in interprete_flows: {str(e)}\n{traceback.format_exc()}")
        raise
    finally:
        conn = sqlite3.connect('thread_state.db')

        cursor = conn.cursor()
        cursor.execute('''
                UPDATE threads SET (is_alive, sig_kill) = (FALSE, FALSE) WHERE domain = ?
            ''', (domain,))
        conn.commit()
        conn.close()
        try:
            if 'driver' in locals():
                driver.quit() 
                pass
        except Exception as e:
            logging.error(f"Error while closing driver: {str(e)}")
    return f"Task {domain} returned.", 0
    
    

def check_stop(domain):
    conn = sqlite3.connect('thread_state.db')

    cursor = conn.cursor()
    cursor.execute('SELECT is_alive, sig_kill FROM threads WHERE domain = ?', (domain,))
    row = cursor.fetchone()
    print(row)

    if row is None:
        conn.close()
        return -1
    elif row[0] and row[1]:
        cursor.execute('''
            UPDATE threads SET (is_alive, sig_kill) = (0, 0) WHERE domain = ?
        ''', (domain,))
        conn.commit()
        conn.close()
        return 1
    else:
        conn.close()
        return 0

def change_state(domain, state):
    conn = sqlite3.connect('thread_state.db')

    cursor = conn.cursor()
    cursor.execute('SELECT * FROM threads WHERE domain = ?', (domain,))
    row = cursor.fetchone()

    if row is None:
        conn.close()
        return -1
    
    cursor.execute('UPDATE threads SET state = ? WHERE domain = ?', (state, domain, ))
    conn.commit()
    conn.close()

    if state == "FAILURE":
        pusher_client.trigger('task-channel', 'change_state', { "domain": domain, "state": "failure" })
    elif state == "REVOKED":
        pusher_client.trigger('task-channel', 'change_state', { "domain": domain, "state": "revoked" })
    elif state == "SUCCESS":
        pusher_client.trigger('task-channel', 'change_state', { "domain": domain, "state": "success" })
    elif state == "RUNNING":
        pusher_client.trigger('task-channel', 'change_state', { "domain": domain, "state": "running" })
    return 0

def log_error(domain_name, crawl_num, error_lev=1, error_info="Default"):
    """
    db_path: sqlite3 db 경로
    domain_name: 도메인 이름 (예: 'example.com')
    crawl_num: 크롤링 번호 (UNIQUE)
    error_lev: 에러 레벨 (기본 1)
    error_info: 에러 정보 (기본 'Default')
    """
    try:
        conn = sqlite3.connect('thread_state.db')
        cursor = conn.cursor()

        # threads 테이블에서 도메인 이름으로 id를 검색
        cursor.execute("SELECT id FROM threads WHERE domain = ?", (domain_name,))
        result = cursor.fetchone()

        if result is None:
            print(f"[ERROR] domain '{domain_name}' not found in threads table.")
            return

        domain_num = result[0]

        # error_info 테이블에 insert
        cursor.execute("""
            INSERT INTO error_info (crawl_num, domain_num, error_lev, error_info)
            VALUES (?, ?, ?, ?)
        """, (crawl_num, domain_num, error_lev, error_info))

        conn.commit()
        print(f"[INFO] Error logged for domain '{domain_name}' with crawl_num={crawl_num}")

    except sqlite3.IntegrityError as e:
        print(f"[IntegrityError] {e}")
    except Exception as e:
        print(f"[Exception] {e}")
    finally:
        conn.close()
