
import re
import os
from os import listdir
from os.path import isfile, join

from http import HTTPStatus

from html.parser import HTMLParser

import json
from datetime import datetime

import cgi
import urllib.parse

def escape(s, quote=True):
    """
    Replace special characters "&", "<" and ">" to HTML-safe sequences.
    If the optional flag quote is true (the default), the quotation mark
    characters, both double quote (") and single quote (') characters are also
    translated.
    """
    s = s.replace("&", "&amp;") # Must be done first!
    s = s.replace("<", "&lt;")
    s = s.replace(">", "&gt;")
    if quote:
        s = s.replace('"', "&quot;")
        s = s.replace('\'', "&#x27;")
    return s

def format_date(miliseconds):
    return datetime.fromtimestamp(miliseconds/1000.).strftime('%Y/%m/%d at %H:%M:%S')

def is_mobile(user_agent):
    expression = re.compile(r".*(iphone|mobile|androidtouch)", re.IGNORECASE)
    if expression.match(user_agent):
        return True
    else:
        return False


browse_template = """

<h1 class="row" style="justify-content: center; align-items: center; padding-top: 14px; padding-bottom: 14px; text-align:center; color:#fff; font-size: 14px !important; width:100%;">
    <div class="col-12 col-sm-10 col-md-5 col-lg-5"
                style="padding: 14px; text-align:center; color:#fff; font-size: 14px !important; width:max-content; display: inline-block; background-color: rgba(0,0,0,.75); border-radius: 12px; border: 1px solid #fff !important;">

        <a style="display: inline-block;">Search:</a>
        <div  style="display: inline;" class="col-12 col-sm-12 col-md-12 col-lg-12">
            <input id="search_criteria"
                style="width:inherit; text-align:center !important; color:#000; background-color:#fff; text-align: left; width:auto;"
                placeholder="Enter search criteria..." value="">
        </div>
    </div>
    
    <div class="col-0 col-sm-0 col-md-1 col-lg-1">
    </div>
    <div class="col-12 col-sm-10 col-md-5 col-lg-5"
                style="padding: 14px; text-align:center; color:#fff; font-size: 14px !important; width:max-content; display: inline-block; background-color: rgba(0,0,0,.75); border-radius: 12px; border: 1px solid #fff !important;">

        <a style="display: inline-block;">Sort:</a>
        <div style="display: inline;" class="col-12 col-sm-12 col-md-12 col-lg-12">
            <button type="button" class="btn search-btn btn-outline-success mx-auto"
                onclick="state.sortViews()">Views</button>
            <button type="button" class="btn search-btn btn-outline-success mx-auto"
                onclick="state.sortVotes()">Votes</button>
            <button type="button" class="btn search-btn btn-outline-success mx-auto"
                onclick="state.sortCreated()">Created</button>
            <button type="button" class="btn search-btn btn-outline-success mx-auto"
                onclick="state.sortEdited()">Edited</button>
        </div>
    </div>
    <br>
    <br>
</h1>
<br>
"""
other_stuuff = """
    <button type="button" class="btn search-btn btn-outline-success mx-auto" style="width:10%!important;"
        onclick="state.previousPage()">&lt;</button>
    <button type="button" class="btn search-btn btn-outline-success mx-auto" style="width:10%!important;"
        onclick="state.firstPage()">&lt;&lt;</button>
    <button type="button" class="btn search-btn btn-outline-success mx-auto" style="width:10%!important;"
        onclick="state.lastPage()">&gt;&gt;</button>
    <button type="button" class="btn search-btn btn-outline-success mx-auto" style="width:10%!important;"
        onclick="state.nextPage()">&gt;</button>
        """


def get_param_value(query_params, param, default=""):
    next_param = False
    for query_param in query_params:
        if next_param:
            return urllib.parse.unquote(query_param)
        if param == query_param:
            next_param = True
    return default


def get_browse_list(server_root, query_params, algorithms_root, request_headers):
    readable_files = [f for f in listdir(
        algorithms_root) if isfile(join(algorithms_root, f))]
    modified_template = browse_template+""
    for f in readable_files:
        aux_path = os.path.realpath(os.path.join(algorithms_root, f))
        file_contents = open(aux_path, 'rb').read()
        algorithm_json = json.loads(file_contents)
        if 'public' in algorithm_json and algorithm_json['public']:
            modified_template += """<h1 class="browse-entry">"""
            # if not is_mobile(request_headers['User-Agent']):
            #     modified_template += """<iframe sandbox="allow-scripts allow-same-origin" allow="microphone" class="browse-iframe"
            #     src='canvas.html?algorithm="""+algorithm_json['name'].lower()+"""'></iframe>"""
            modified_template += """
            <div class="row">
                <div class="col-12 col-sm-12 col-md-12 col-lg-12">
                    <input disabled style="background: none; border: none !important; width:inherit; text-align:center; color:#fff;"
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
                created = datetime.fromtimestamp(
                    algorithm_json['created']/1000.).strftime('%Y/%m/%d at %H:%M:%S')
            edited = "tomorrow"
            if 'edited' in algorithm_json:
                edited = datetime.fromtimestamp(
                    algorithm_json['edited']/1000.).strftime('%Y/%m/%d at %H:%M:%S')
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

            modified_template += """
                <button style="background-color: rgba(0,0,0,.75);" type="button" onclick="state.browse_edit(\'"""+algorithm_json['name']+"""\')"
                    class="btn btn-outline-success mx-auto">Edit</button>
                <button style="background-color: rgba(0,0,0,.75);" type="button" onclick="state.browse_fork(\'"""+algorithm_json['name']+"""\')"
                    class="btn btn-outline-success mx-auto">Fork</button>
                <button style="background-color: rgba(0,0,0,.75);" type="button" onclick="state.browse_preview(\'"""+algorithm_json['name']+"""\')"
                    class="btn btn-outline-success mx-auto">Preview</button>
                <button style="background-color: rgba(0,0,0,.75);" type="button" onclick="state.browse_download(\'"""+algorithm_json['name']+"""\')"
                    class="btn btn-outline-success mx-auto">Download</button>
            """

            modified_template += """</h1><br><br>"""
    return modified_template


def get_algorithm_information(server_root, query_params, algorithms_root, request_headers):
    flattened_algorithm_name = get_param_value(query_params, "algorithm", "background").lower().replace(" ", "_")
    dangeros_path = join(algorithms_root, flattened_algorithm_name+".json")
    
    valid = False
    algorithm_json = None
    if os.path.commonpath((algorithms_root, dangeros_path)) == algorithms_root and os.path.exists(dangeros_path):
        file_contents = open(dangeros_path, 'rb').read()
        algorithm_json = json.loads(file_contents)
        if 'public' in algorithm_json and algorithm_json['public']:
            valid = True

    algorithm_information = """
        <h1 class="read_only"
            style="padding: 14px; text-align:center; color:#fff; font-size: 14px !important; width:max-content; display: inline-block; background-color: rgba(0,0,0,.75); border-radius: 12px; border: 1px solid #fff !important;">
            <a>Algorithm Information</a>
        </h1>
        <h1 onclick="profileClicked(algorithm.owner)" class="read_only"
            style="text-align:center; padding-top: 14px; padding-bottom: 14px; color:#fff; font-size: 14px !important; width:auto; background-color: rgba(0,0,0,.75); border-radius: 12px; border: 1px solid #fff !important;">
            <div class="row">
                <div class="col-12 col-sm-12 col-md-6 col-lg-6" style="align-self: center; color:#0f0;">
                    <a>Algorithm Title:</a>
                    <br>
                    <br>
                </div>
                <div class="col-12 col-sm-12 col-md-6 col-lg-6">
                    <input disabled id="edit_algorithm_title" style="background: none; border: none !important; width:inherit; text-align:center; color:#fff;"
                        placeholder="Algorithm name..." value='"""+(algorithm_json['name'] if valid and 'name' in algorithm_json else "")+"""'></input>
                    <br>
                    <br>
                </div>
            </div>
            <div class="row">
                <div class="col-12 col-sm-12 col-md-6 col-lg-6" style="align-self: center; color:#0f0;">
                    <a>Algorithm Author:</a>
                    <br>
                    <br>
                </div>
                <div class="col-12 col-sm-12 col-md-6 col-lg-6">
                    <input disabled id="edit_algorithm_author" style="background: none; border: none !important; width:inherit; text-align:center; color:#fff;"
                        placeholder="Author name..." value='"""+(algorithm_json['owner'] if valid and 'owner' in algorithm_json else "")+"""'></input>
                    <br>
                    <br>
                </div>
            </div>
            <div class="row">
                <div class="col-12 col-sm-12 col-md-6 col-lg-6" style="align-self: center; color:#0f0;">
                    <a>Date Created:</a>
                    <br>
                    <br>
                </div>
                <div class="col-12 col-sm-12 col-md-6 col-lg-6">
                    <input disabled id="edit_algorithm_created" style="background: none; border: none !important; width:inherit; text-align:center; color:#fff;"
                        placeholder="Date created..." value='"""+(format_date(algorithm_json['created']) if valid and 'created' in algorithm_json else "")+"""'></input>
                    <br>
                    <br>
                </div>
            </div>
            <div class="row">
                <div class="col-12 col-sm-12 col-md-6 col-lg-6" style="align-self: center; color:#0f0;">
                    <a>Date Updated:</a>
                    <br>
                    <br>
                </div>
                <div class="col-12 col-sm-12 col-md-6 col-lg-6">
                    <input disabled id="edit_algorithm_edited" style="background: none; border: none !important; width:inherit; text-align:center; color:#fff;"
                        placeholder="Date updated..." value='"""+(format_date(algorithm_json['edited']) if valid and 'edited' in algorithm_json else "")+"""'></input>
                    <br>
                    <br>
                </div>
            </div>
            <div class="row">
                <div class="col-12 col-sm-12 col-md-6 col-lg-6" style="align-self: center; color:#0f0;">
                    <a>View Count:</a>
                    <br>
                    <br>
                </div>
                <div class="col-12 col-sm-12 col-md-6 col-lg-6">
                    <input disabled id="edit_algorithm_views" style="background: none; border: none !important; width:inherit; text-align:center; color:#fff;"
                        placeholder="View count..." value='"""+(str(algorithm_json['views']) if valid and 'views' in algorithm_json else "")+"""'></input>
                    <br>
                    <br>
                </div>
            </div>
            <div class="row">
                <div class="col-12 col-sm-12 col-md-6 col-lg-6" style="align-self: center; color:#0f0;">
                    <a>Vote Tally:</a>
                    <br>
                    <br>
                </div>
                <div class="col-12 col-sm-12 col-md-6 col-lg-6">
                    <input disabled id="edit_algorithm_votes" style="background: none; border: none !important; width:inherit; text-align:center; color:#fff;"
                        placeholder="Vote tally..." value='"""+((""+str(len(algorithm_json['up_votes'])-len(algorithm_json['down_votes']))) if valid and 'up_votes' in algorithm_json and 'down_votes' in algorithm_json else "")+"""'></input>
                    <br>
                    <br>
                </div>
            </div>
            <div class="row">
                <div class="col-12 col-sm-12 col-md-12 col-lg-12" style="align-self: center; color:#0f0;">
                    <a>Algorithm Description:</a>
                    <br>
                    <br>
                </div>
                <div class="col-12 col-sm-12 col-md-12 col-lg-12">
                    <textarea id="edit_description" rows="8" style="background: none; text-align:left; color:#fff;"
                        placeholder="Algorithm description...">"""+(escape(algorithm_json['description']) if valid and 'description' in algorithm_json else "")+"""</textarea>
                </div>
            </div>
        </h1>
        """
    return algorithm_information
def get_algorithm_comments(server_root, query_params, algorithms_root, request_headers):
    flattened_algorithm_name = get_param_value(query_params, "algorithm", "background").lower().replace(" ", "_")
    dangeros_path = join(algorithms_root, flattened_algorithm_name+".json")
    
    valid = False
    algorithm_json = None
    if os.path.commonpath((algorithms_root, dangeros_path)) == algorithms_root and os.path.exists(dangeros_path):
        file_contents = open(dangeros_path, 'rb').read()
        algorithm_json = json.loads(file_contents)
        if 'public' in algorithm_json and algorithm_json['public']:
            valid = True

    if not valid:
        return ""

    algorithm_comments = ""

    if not 'comments' in algorithm_json or len(algorithm_json['comments']) == 0:
        algorithm_comments += """
        <h1 class="blink-white" style="padding: 14px; text-align:center; color:#fff; font-size: 14px !important; width:max-content; display: inline-block; background-color: rgba(0,0,0,.75); border-radius: 12px; border: 1px solid #fff !important;">
            There are currently comments!
        </h1>
        <br>"""
    else:
        algorithm_comments = """
            <h1 style="padding: 14px; text-align:center; color:#fff; font-size: 14px !important; width:max-content; display: inline-block; background-color: rgba(0,0,0,.75); border-radius: 12px; border: 1px solid #fff !important;">
                <a style="color:#FFF!important; ">Comments:</a>
            </h1>
            <br>"""
        for comment in algorithm_json['comments']:
            algorithm_comments += """<h1 style="padding: 14px; text-align:center; color:#fff; font-size: 14px !important; width:max-content; display: inline-block; background-color: rgba(0,0,0,.75); border-radius: 12px; border: 1px solid #fff !important;">"""
            algorithm_comments += escape(comment.message)+"<br>"
            algorithm_comments += "Posted by "+comment.owner+" on "+format_date(comment.date)
            algorithm_comments += """</h1><br>"""
        

    algorithm_comments += """
        <h1 style="padding: 14px; text-align:center; color:#fff; font-size: 14px !important; width:100%; display: inline-block; background-color: rgba(0,0,0,.75); border-radius: 12px; border: 1px solid #fff !important;">
            <textarea id="edit_description" rows="8" style="width:100%; background: none; text-align:left; color:#fff;"
                placeholder="Enter a new comment here..."></textarea>
            <br>
            <div class="col-12 col-sm-12 col-md-12 col-lg-12">
            <button type="button" class="btn search-btn btn-outline-success mx-auto"
                onclick="state.submit_comment()">Submit</button>
            </div>
        </h1>
        """
    return algorithm_comments

def format_document(content, server_root, query_params, algorithms_root, request_headers):
    pattern = r'\<\!\-\-\-\#.*?\#\-\-\-\>'
    last_end = 0
    new_content = ""
    for occurance in re.finditer(pattern, content):
        template = occurance.group(0)
        value = template[6:len(template)-5]
        if value.lower() == "browse_view":
            value = get_browse_list(server_root, query_params, algorithms_root, request_headers)
        elif value.lower() == "algorithm_information":
            value = get_algorithm_information(server_root, query_params, algorithms_root, request_headers)
        elif value.lower() == "algorithm_comments":
            value = get_algorithm_comments(server_root, query_params, algorithms_root, request_headers)
        else:
            value = ""
        new_content += content[last_end: occurance.start()] + value
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
                aux_path = os.path.realpath(os.path.join(
                    www_root, template[4:len(template)-2]))
                file_contents = open(aux_path, 'rb').read().decode("utf-8")
                file_contents = format_document(
                    file_contents, server_root, query_params, algorithms_root, request_headers)
                new_body += body[last_end: occurance.start()] + file_contents
                last_end = occurance.end()+1
            new_body += body[last_end:len(body)]
            body = new_body.encode()

        elif short_path.lower() == "canvas.html":

            algorithm_file_name = get_param_value(
                query_params, "algorithm")+".json"
            algorithm_file = os.path.join(algorithms_root, algorithm_file_name)

            body = body.decode("utf-8")
            pattern = r'//\{\{.*?\}\}'
            last_end = 0
            new_body = ""
            for occurance in re.finditer(pattern, body):
                template = occurance.group(0)
                aux_path = os.path.realpath(os.path.join(
                    www_root, template[4:len(template)-2]))
                file_contents = open(aux_path, 'rb').read().decode("utf-8")
                new_body += body[last_end: occurance.start()] + file_contents
                last_end = occurance.end()+1
            new_body += body[last_end:len(body)]
            body = new_body

            if os.path.commonpath((algorithms_root, algorithm_file)) and os.path.exists(algorithm_file):
                delimeter = "//ALGORITHM_INSERTION_POINT"
                index = body.find(delimeter)
                file_contents = "handle_event({proto:"
                file_contents += open(algorithm_file,
                                      'rb').read().decode("utf-8")
                file_contents += "})"
                body = body[0: index] + file_contents + \
                    body[index+len(delimeter): len(body)]
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
