import re

def convert_to_bytes(size_str):
    size_str = size_str.strip().upper()  # 공백 제거 및 대문자 변환

    # 숫자 부분 추출 (소수점 포함)
    match = re.search(r'\d+(\.\d+)?', size_str)
    if not match:
        raise ValueError("숫자를 찾을 수 없습니다.")

    number = float(match.group())  # 매칭된 숫자를 float 변환

    # 단위 추출 (K, M, G 중 하나)
    unit_match = re.search(r'[KMG]', size_str, re.IGNORECASE)
    if not unit_match:
        raise ValueError("지원하지 않는 단위입니다. 'K', 'M', 'G' 중 하나여야 합니다.")

    unit = unit_match.group().upper()  # 단위 추출 후 대문자로 변환

    # 단위별 변환
    if unit == 'K':  # KB
        return round(number * 1024)
    elif unit == 'M':  # MB
        return round(number * 1024 ** 2)
    elif unit == 'G':  # GB
        return round(number * 1024 ** 3)
    else:
        raise ValueError("지원하지 않는 단위입니다. 'K', 'M', 'G' 중 하나여야 합니다.")
    
print(convert_to_bytes("1.01 KB"))