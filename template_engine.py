import os
import re
from http import HTTPStatus

from html.parser import HTMLParser


def get_param_value(query_params, param):
    next_param = False
    for query_param in query_params:
        if next_param:
            return query_param
        if param == query_param:
            next_param = True
    return ""


def render_template(server_root, query_params, www_root, www_path, algorithms_root, short_path, request_headers, response_headers, ctype, parsed):
    body = ""
    if short_path.lower().startswith("/algorithms/"):
        algorithm_file = os.path.join(server_root, short_path.lower())
        if os.path.commonpath((algorithms_root, algorithm_file)) == algorithms_root and os.path.exists(algorithm_file):
            body = open(algorithm_file, 'rb').read()
            body = body.decode("utf-8")
        else:
            print("404 ALGORITHM NOT FOUND")
            return HTTPStatus.NOT_FOUND, [], b'404 ALGORITHM NOT FOUND'
    elif short_path.lower() == "index.html":
        body = open(www_path, 'rb').read()
        body = body.decode("utf-8")
        pattern = r'\{\{.*?\}\}'
        last_end = 0
        new_body = ""
        for occurance in re.finditer(pattern, body):
            template = occurance.group(0)
            aux_path = os.path.realpath(os.path.join(
                www_root, template[2:len(template)-2]))
            file_contents = open(aux_path, 'rb').read().decode("utf-8")
            new_body += body[last_end: occurance.start()] + file_contents
            last_end = occurance.end()+1
        new_body += body[last_end:len(body)]
        body = new_body.encode()
    elif short_path.lower() == "canvas.html":
        body = open(www_path, 'rb').read()
        body = body.decode("utf-8")
        algorithm_file_name = get_param_value(query_params, "algorithm")+".json"
        algorithm_file = os.path.join(algorithms_root, algorithm_file_name)
        if os.path.commonpath((algorithms_root, algorithm_file)) and os.path.exists(algorithm_file):
            pattern = r'\{\{.*?\}\}'
            last_end = 0
            new_body = ""
            for occurance in re.finditer(pattern, body):
                template = occurance.group(0)
                aux_path = os.path.realpath(os.path.join(
                    www_root, template[2:len(template)-2]))
                file_contents = open(aux_path, 'rb').read().decode("utf-8")
                new_body += body[last_end: occurance.start()] + file_contents
                last_end = occurance.end()+1
            new_body += body[last_end:len(body)]
            body = new_body
            delimeter = "//ALGORITHM_INSERTION_POINT"
            index = body.find(delimeter)
            file_contents = "handle_event({proto:"
            file_contents += open(algorithm_file, 'rb').read().decode("utf-8")
            file_contents += "})"
            body = body[0: index] + file_contents + \
                body[index+len(delimeter): len(body)]
            body = body.encode()
        else:
            print("404 ALGORITHM NOT FOUND")
            return HTTPStatus.NOT_FOUND, [], b'404 ALGORITHM NOT FOUND'

    response_headers.append(("Content-type", ctype))
    response_headers.append(('Content-Length', str(len(body))))
    # response_headers.append(('Access-Control-Allow-Origin', '*'))
    response_headers.append(('Connection', 'close'))
    return HTTPStatus.OK, response_headers, body
