import os
import re
from http import HTTPStatus

from html.parser import HTMLParser


def render_template(www_root, www_path, algorithms_root, short_path, request_headers, response_headers, ctype, parsed):
    if not os.path.exists(www_path) or not os.path.isfile(www_path):
        print("404 NOT FOUND")
        return HTTPStatus.NOT_FOUND, [], b'404 NOT FOUND'
    else:
        body = open(www_path, 'rb').read()
        if short_path.lower() == "index.html":
            body = body.decode("utf-8")
            pattern = r'\{\{.*?\}\}'
            last_end = 0
            new_body = ""
            for occurance in re.finditer(pattern, body):
                template = occurance.group(0)
                aux_path = os.path.realpath(os.path.join(www_root, template[2:len(template)-2]))
                file_contents = open(aux_path, 'rb').read().decode("utf-8") 
                new_body += body[last_end: occurance.start()]+ file_contents 
                last_end = occurance.end()+1
            new_body += body[last_end:len(body)]
            body = new_body.encode()
        elif short_path.lower() == "canvas.html":
            body = body.decode("utf-8")
            delimeter = "//ALGORITHM_INSERTION_POINT"
            index = body.find(delimeter)
            file_contents = open(aux_path, 'rb').read().decode("utf-8") 
            body = body[0: index]+ file_contents +body[index+len(delimeter): len(body)]
            
            pattern = r'\{\{.*?\}\}'
            last_end = 0
            new_body = ""
            for occurance in re.finditer(pattern, body):
                template = occurance.group(0)
                aux_path = os.path.realpath(os.path.join(www_root, template[2:len(template)-2]))
                file_contents = open(aux_path, 'rb').read().decode("utf-8") 
                new_body += body[last_end: occurance.start()]+ file_contents 
                last_end = occurance.end()+1
            new_body += body[last_end:len(body)]
            
            body = body.encode()
            
        response_headers.append(("Content-type", ctype))
        response_headers.append(('Content-Length', str(len(body))))
        # response_headers.append(('Access-Control-Allow-Origin', '*'))
        response_headers.append(('Connection', 'close'))
        return HTTPStatus.OK, response_headers, body
