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
            pattern = r'\{\{.*?\}\}'
            body = body.decode("utf-8")
            for occurance in re.finditer(pattern, body):
                template = occurance.group(0)
                aux_path = os.path.realpath(os.path.join(www_root, template[2:len(template)-2]))
                body = body[0: occurance.start()]+ open(aux_path, 'rb').read().decode("utf-8") + body[occurance.end()+1: len(body)]
            body = body.encode()
            
        response_headers.append(("Content-type", ctype))
        response_headers.append(('Content-Length', str(len(body))))
        # response_headers.append(('Access-Control-Allow-Origin', '*'))
        response_headers.append(('Connection', 'close'))
        return HTTPStatus.OK, response_headers, body
