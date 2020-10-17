
import re
import os

from http import HTTPStatus

from html.parser import HTMLParser

browse_template = """
<div class="row">
	<div class="col-xs-0 col-sm-2 col-md-2 col-lg-3">
	</div>
	<div class="col-xs-12 col-sm-8 col-md-8 col-lg-6" style="text-align: center; padding: 0px;">
		<div style="text-align: center; display:block;">
			<ion-input id="searchBar" #searchBar class="search-area" style="color:#fff; margin-right: 5px !important;  display:inline-block; width:40%;"
			 placeholder="Enter search criteria..." [(ngModel)]="searchInput"></ion-input>&nbsp;
			<a class="search-area custom-btn btn btn-lg btn-primary" (click)="search()" role="button">Search</a>
		</div>
		<br>
		<p>
			<a [ngClass]="sortButtons[0]" class="custom-btn btn btn-lg btn-primary" (click)="sortViews()" role="button">Views</a>
			<a [ngClass]="sortButtons[1]" class="custom-btn btn btn-lg btn-primary" (click)="sortVotes()" role="button">Votes</a>
			<a [ngClass]="sortButtons[2]" class="custom-btn btn btn-lg btn-primary" (click)="sortCreated()" role="button">Created</a>
			<a [ngClass]="sortButtons[3]" class="custom-btn btn btn-lg btn-primary" (click)="sortEdited()" role="button">Edited</a></p>
		<p>
			<a class="custom-btn btn btn-lg btn-primary" style="border: 3px solid #f00 !important;" (click)="clearSearch()" role="button">Clear Search / Clear Sort</a></p>
		<p>
			<a class="custom-btn btn btn-lg btn-primary" style="width:10%!important;" (click)="previousPage()" role="button">&lt;</a>
			<a class="custom-btn btn btn-lg btn-primary" style="width:10%!important;" (click)="firstPage()" role="button">&lt;&lt;</a>
			<a class="custom-btn btn btn-lg btn-primary" style="width:10%!important;" (click)="lastPage()" role="button">&gt;&gt;</a>
			<a class="custom-btn btn btn-lg btn-primary" style="width:10%!important;" (click)="nextPage()" role="button">&gt;</a></p>
		<p>
			<a class="custom-btn btn btn-lg btn-primary" (click)="copyCriteriea()" role="button">Page {{paging.current_page+1}} of {{paging.max_page}}</a></p>
	</div>
	<div class="col-xs-0 col-sm-2 col-md-2 col-lg-3">
	</div>
</div>
<div class="row">
	<div class="col-xs-0 col-sm-2 col-md-2 col-lg-2">
	</div>
	<div class="col-xs-12 col-sm-8 col-md-8 col-lg-8">
		<div class="row" style="text-align: center; padding: 0px;">
			<div style="width:100%; height:auto" class="container">
				<ion-list>
					<ion-item *ngFor="let unit of algorithmArray; let i = index;">
						<ion-card [ngClass]="algorithmArray[i].customClass" (mouseenter)="enter(unit.index)" (mouseleave)="leave(unit.index)"
						 (click)="click(unit.index)">
							<img src="{{((algorithmArray[i].thumbnail && algorithmArray[i].thumbnail.url) ? algorithmArray[i].thumbnail.url : defaultImage)}}" style="height:100% !important; max-height:128px !important; width:auto!important; clear: right !important; float: left !important; margin: 5px !important; border: 2px solid #0f0 !important;"
							/>
							<ion-card-content style="word-wrap: normal !important; white-space: normal !important;">
								<p style="min-width:33% !important; color:#FFF!important;">
									<u><a style="color:#0F0!important;">Title</a></u>&nbsp;{{algorithmArray[i].name}}
									<br>
									<u><a style="color:#0F0!important;">Author</a></u>&nbsp;{{algorithmArray[i].owner.name}}
									<br>
									<u><a style="color:#0F0!important;">Created</a></u>&nbsp;{{getCreated(i)}}
									<br>
									<u><a style="color:#0F0!important;">Edited</a></u>&nbsp;{{getEdited(i)}}
									<br>
									<u><a style="color:#0F0!important;">Views</a></u>&nbsp;{{algorithmArray[i].views}}
									<br>
									<u><a style="color:#0F0!important;">Votes</a></u>&nbsp;{{getVotes(i)}}
									<br>
									<u><a style="color:#0F0!important;">Comments</a></u>&nbsp;{{getComments(i)}}
									<br>
									<u><a style="color:#0F0!important;">Description</a></u>&nbsp;{{algorithmArray[i].description}}
								</p>
							</ion-card-content>
						</ion-card>
					</ion-item>
				</ion-list>
			</div>
		</div>
	</div>
	<div class="col-xs-0 col-sm-2 col-md-2 col-lg-2">
	</div>
</div>
<div class="row">
	<div class="col-xs-0 col-sm-2 col-md-2 col-lg-3">
	</div>
	<div class="col-xs-12 col-sm-8 col-md-8 col-lg-6">
		<div style="text-align: center; display:block;">
			<p>
				<a class="custom-btn btn btn-lg btn-primary" (click)="copyCriteriea()" role="button">Page {{paging.current_page+1}} of {{paging.max_page}}</a></p>
			<p>
				<a class="custom-btn btn btn-lg btn-primary" style="width:10%!important;" (click)="previousPage()" role="button">&lt;</a>
				<a class="custom-btn btn btn-lg btn-primary" style="width:10%!important;" (click)="firstPage()" role="button">&lt;&lt;</a>
				<a class="custom-btn btn btn-lg btn-primary" style="width:10%!important;" (click)="lastPage()" role="button">&gt;&gt;</a>
				<a class="custom-btn btn btn-lg btn-primary" style="width:10%!important;" (click)="nextPage()" role="button">&gt;</a></p>
		</div>
	</div>
	<div class="col-xs-0 col-sm-2 col-md-2 col-lg-3">
	</div>
</div>
"""


def get_browse_list(server_root, query_params, algorithms_root):
    return browse_template

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


def get_param_value(query_params, param):
    next_param = False
    for query_param in query_params:
        if next_param:
            return query_param
        if param == query_param:
            next_param = True
    return ""

def render_template(server_root, query_params, www_root, www_path, algorithms_root, short_path, request_headers, response_headers, ctype, parsed):
    body = b""
    if short_path.lower().startswith("algorithms/"):
        algorithm_file = os.path.join(server_root, short_path.lower())
        if os.path.commonpath((algorithms_root, algorithm_file)) == algorithms_root and os.path.exists(algorithm_file):
            body = open(algorithm_file, 'rb').read()
            response_headers.append(("Content-type", ctype))
            response_headers.append(('Content-Length', str(len(body))))
            # response_headers.append(('Access-Control-Allow-Origin', '*'))
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
            pattern = r'\{\{.*?\}\}'
            last_end = 0
            new_body = ""
            for occurance in re.finditer(pattern, body):
                template = occurance.group(0)
                aux_path = os.path.realpath(os.path.join(www_root, template[2:len(template)-2]))
                file_contents = open(aux_path, 'rb').read().decode("utf-8") 
                file_contents = format_document(file_contents, server_root, query_params, algorithms_root)
                new_body += body[last_end: occurance.start()]+ file_contents 
                last_end = occurance.end()+1
            new_body += body[last_end:len(body)]
            body = new_body.encode()

        elif short_path.lower() == "canvas.html":
            
            algorithm_file_name = get_param_value(query_params, "algorithm")+".json"
            algorithm_file = os.path.join(algorithms_root, algorithm_file_name)
            if os.path.commonpath((algorithms_root, algorithm_file)) and os.path.exists(algorithm_file):
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
                body = new_body
                delimeter = "//ALGORITHM_INSERTION_POINT"
                index = body.find(delimeter)
                file_contents = "handle_event({proto:"
                file_contents += open(algorithm_file, 'rb').read().decode("utf-8") 
                file_contents += "})"
                body = body[0: index]+ file_contents +body[index+len(delimeter): len(body)]
                body = body.encode()
            else:
                print("404 ALGORITHM NOT FOUND")
                return HTTPStatus.NOT_FOUND, [], b'404 ALGORITHM NOT FOUND'
    
        response_headers.append(("Content-type", ctype))
        response_headers.append(('Content-Length', str(len(body))))
        # response_headers.append(('Access-Control-Allow-Origin', '*'))
        response_headers.append(('Connection', 'close'))
        return HTTPStatus.OK, response_headers, body
        
            