
import re
import os
from os import listdir
from os.path import isfile, join

from http import HTTPStatus

from html.parser import HTMLParser

import json
from datetime import datetime

browse_template = """

    <div class="col-0 col-sm-1 col-md-2 col-lg-3">
    </div>
    <div class="col-12 col-sm-10 col-md-8 col-lg-6">
<h1 style="margin-top:5%; margin-bottom:5%; padding-top: 14px; padding-bottom: 14px; text-align:center; color:#fff; font-size: 14px !important; width:auto; background-color: rgba(0,0,0,.75); border-radius: 12px; border: 1px solid #fff !important;">

    <a>Search Criteria:</a>
    <br>
    <br>
    <input id="search_criteria"
        style="width:inherit; text-align:center !important; color:#fff; text-align: left;"
        placeholder="Enter search criteria..." value="">
    <br>
    <br>
    <button type="button" class="btn search-btn btn-outline-success mx-auto"
        onclick="state.sortViews()">Views</button>
    <button type="button" class="btn search-btn btn-outline-success mx-auto"
        onclick="state.sortVotes()">Votes</button>
    <button type="button" class="btn search-btn btn-outline-success mx-auto"
        onclick="state.sortCreated()">Created</button>
    <button type="button" class="btn search-btn btn-outline-success mx-auto"
        onclick="state.sortEdited()">Edited</button>
    <br>
    <br>
    <button type="button" class="btn btn-outline-danger mx-auto" onclick="state.clearSearch()">Clear</button>
    <button type="button" class="btn btn-outline-success mx-auto" onclick="state.clearSearch()">Execute</button>
    <br>
    <br>
    <button type="button" class="btn search-btn btn-outline-success mx-auto" style="width:10%!important;"
        onclick="state.previousPage()">&lt;</button>
    <button type="button" class="btn search-btn btn-outline-success mx-auto" style="width:10%!important;"
        onclick="state.firstPage()">&lt;&lt;</button>
    <button type="button" class="btn search-btn btn-outline-success mx-auto" style="width:10%!important;"
        onclick="state.lastPage()">&gt;&gt;</button>
    <button type="button" class="btn search-btn btn-outline-success mx-auto" style="width:10%!important;"
        onclick="state.nextPage()">&gt;</button>
    <br>
    <br>
    Page {{current_page}} of {{max_page}}
</h1>
</div>
    <div class="col-0 col-sm-1 col-md-2 col-lg-3">
    </div>
<br>
"""

def get_param_value(query_params, param, default=""):
    next_param = False
    for query_param in query_params:
        if next_param:
            return query_param
        if param == query_param:
            next_param = True
    return default

def get_browse_list(server_root, query_params, algorithms_root):
    readable_files = [f for f in listdir(algorithms_root) if isfile(join(algorithms_root, f))]
    modified_template = browse_template+""
    for f in readable_files:
        aux_path = os.path.realpath(os.path.join(algorithms_root, f))
        file_contents = open(aux_path, 'rb').read()
        algorithm_json = json.loads(file_contents)
        if algorithm_json['public']:
            modified_template += """
            <h1 class="browse-entry">"""
            modified_template += """<iframe sandbox="allow-scripts allow-same-origin" allow="microphone" class="browse-iframe"
            src='canvas.html?algorithm="""+algorithm_json['name'].lower()+"""'></iframe>
            <div class="row">
                <div class="col-12 col-sm-12 col-md-12 col-lg-12">
                    <input style="background: none; border: none !important; width:inherit; text-align:center; color:#fff;"
                        placeholder="Algorithm name..." value='"""+algorithm_json['name']+"""'></input>
                </div>
            </div>"""
            if 'owner' in algorithm_json:
                modified_template += """
                <div class="row" style="">
                    <div class="col-12 col-sm-12 col-md-12 col-lg-12">
                        <input disabled style="background: none; border: none !important; width:inherit; text-align:center; color:#fff;"
                            placeholder="Author name..." value='by """+algorithm_json['owner']+"""'></input>
                    </div>
                </div>"""
            created = "fornever ago"
            if 'created' in algorithm_json:
                created = datetime.fromtimestamp(algorithm_json['created']/1000.).strftime('%Y/%m/%d at %H:%M:%S')
            edited = "tomorrow"
            if 'edited' in algorithm_json:
                edited = datetime.fromtimestamp(algorithm_json['edited']/1000.).strftime('%Y/%m/%d at %H:%M:%S')
            modified_template += """
            <div class="row" style="">
                <div class="col-12 col-sm-12 col-md-12 col-lg-12">
                    <input disabled style="background: none; border: none !important; width:inherit; text-align:center; color:#fff;"
                        placeholder="Date created..." value='Created """+created+"""'></input>
                </div>
            </div>"""
            modified_template += """
            <div class="row" style="">
                <div class="col-12 col-sm-12 col-md-12 col-lg-12">
                    <input disabled style="background: none; border: none !important; width:inherit; text-align:center; color:#fff;"
                        placeholder="Date edited..." value='Edited """+edited+"""'></input>
                </div>
            </div>"""
                
            modified_template += """</h1><br><br>"""
    return modified_template

def format_document(content, server_root, query_params, algorithms_root):
    pattern = r'\<\!\-\-\-\#.*?\#\-\-\-\>'
    last_end = 0
    new_content = ""
    for occurance in re.finditer(pattern, content):
        template = occurance.group(0)
        value = template[6:len(template)-5]
        if value.lower() == "browse_view":
            value = get_browse_list(server_root, query_params, algorithms_root)
        else:
            value = ""
        new_content += content[last_end: occurance.start()]+ value
        last_end = occurance.end()+1
    new_content += content[last_end:len(content)]
    return new_content


def render_template(server_root, query_params, www_root, www_path, algorithms_root, short_path, request_headers, response_headers, ctype, parsed):
    body = b""
    if short_path.lower().startswith("algorithms/"):
        algorithm_file = os.path.join(server_root, short_path.lower())
        if os.path.commonpath((algorithms_root, algorithm_file)) == algorithms_root and os.path.exists(algorithm_file):
            body = open(algorithm_file, 'rb').read()
            response_headers.append(("Content-type", ctype))
            response_headers.append(('Content-Length', str(len(body))))
            response_headers.append(('Access-Control-Allow-Origin', '*'))
            response_headers.append(('Connection', 'close'))
            return HTTPStatus.OK, response_headers, body
        else:
            print("404 ALGORITHM NOT FOUND")
            return HTTPStatus.NOT_FOUND, [], b'404 ALGORITHM NOT FOUND'
    elif not os.path.exists(www_path) or not os.path.isfile(www_path):
        print("404 NOT FOUND")
        return HTTPStatus.NOT_FOUND, [], b'404 NOT FOUND'
    else:
        body = open(www_path, 'rb').read()
        if short_path.lower() == "index.html":
            body = body.decode("utf-8")
            pattern = r'//\{\{.*?\}\}'
            last_end = 0
            new_body = ""
            for occurance in re.finditer(pattern, body):
                template = occurance.group(0)
                aux_path = os.path.realpath(os.path.join(www_root, template[4:len(template)-2]))
                file_contents = open(aux_path, 'rb').read().decode("utf-8") 
                file_contents = format_document(file_contents, server_root, query_params, algorithms_root)
                new_body += body[last_end: occurance.start()]+ file_contents 
                last_end = occurance.end()+1
            new_body += body[last_end:len(body)]
            body = new_body.encode()

        elif short_path.lower() == "canvas.html":
            
            algorithm_file_name = get_param_value(query_params, "algorithm")+".json"
            algorithm_file = os.path.join(algorithms_root, algorithm_file_name)
            
            body = body.decode("utf-8")
            pattern = r'//\{\{.*?\}\}'
            last_end = 0
            new_body = ""
            for occurance in re.finditer(pattern, body):
                template = occurance.group(0)
                aux_path = os.path.realpath(os.path.join(www_root, template[4:len(template)-2]))
                file_contents = open(aux_path, 'rb').read().decode("utf-8") 
                new_body += body[last_end: occurance.start()]+ file_contents 
                last_end = occurance.end()+1
            new_body += body[last_end:len(body)]
            body = new_body
            
            if os.path.commonpath((algorithms_root, algorithm_file)) and os.path.exists(algorithm_file):
                delimeter = "//ALGORITHM_INSERTION_POINT"
                index = body.find(delimeter)
                file_contents = "handle_event({proto:"
                file_contents += open(algorithm_file, 'rb').read().decode("utf-8") 
                file_contents += "})"
                body = body[0: index]+ file_contents +body[index+len(delimeter): len(body)]
            else:
                body = body.encode()
                print("404 ALGORITHM NOT FOUND")
                response_headers.append(("Content-type", ctype))
                response_headers.append(('Content-Length', str(len(body))))
                # response_headers.append(('Access-Control-Allow-Origin', '*'))
                response_headers.append(('Connection', 'close'))
                return HTTPStatus.NOT_FOUND, response_headers, body
            body = body.encode()
    
        response_headers.append(("Content-type", ctype))
        response_headers.append(('Content-Length', str(len(body))))
        # response_headers.append(('Access-Control-Allow-Origin', '*'))
        response_headers.append(('Connection', 'close'))
        return HTTPStatus.OK, response_headers, body
        
            