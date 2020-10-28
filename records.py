import os
import re
import google.protobuf.json_format as json_format
from os import listdir
from os.path import isfile, join
from messages_pb2 import Message, Algorithm
import asyncio
import math, datetime, time
from captcha.image import ImageCaptcha
import json
import random

import smtplib
from email.mime.text import MIMEText
from urllib.parse import quote
from email.mime.multipart import MIMEMultipart

class Records:
    websocket_connections = []
    loop = None
    captcha_timeout = 60*60 #seconds
    captcha_length = 5
    image_captcha = ImageCaptcha(fonts=["./FreeMono.ttf"])

    def __init__(self, server_loop):
        self.loop = server_loop
        pass
    
    def check_http_request_auth(self, user_name, maybe_hash):
        authed = False
        for websocket in self.websocket_connections:
            try:
                if type(websocket) != type(None) and hasattr(websocket, 'user') and type(websocket.user) != type(None) and type(websocket.user.auth) != type(None) and websocket.user.auth.user == user_name:
                    user = self.get_user_by_name(websocket.user.auth.user)
                    if type(user) == type(None) or not user.auth.validated or maybe_hash != user.auth.hash:
                        authed = False
                    else:
                        authed = True
                    break
            except Exception as e: 
                print(str(e))
        return authed

    def new_connection(self, websocket):
        this_id = len(self.websocket_connections)
        websocket.this_id = this_id
        self.websocket_connections.append(websocket)

    def destroy_connection(self, websocket):
        self.websocket_connections[websocket.this_id] = None
            
    def read_users(self):
        users_root = os.path.join(os.path.dirname(os.path.abspath(__file__)),"users")
        readable_files = [f for f in listdir(users_root) if isfile(join(users_root, f))]
        files = [open(os.path.join(users_root, f), "rb") for f in readable_files]
        contents = [f.read() for f in files]
        [f.close() for f in files]
        proto_users = [json_format.Parse(content, Message()) for content in contents]
        return proto_users

    def get_user_by_name(self,name):
        users = self.read_users()
        for user in users:
            if user.auth.user.lower() == name.lower():
                return user
        return None
        
    def get_user_by_email(self,email):
        users = self.read_users()
        for user in users:
            if user.auth.email.lower() == email.lower():
                return user
        return None

    def write_user(self,user_message):
        users_root = os.path.join(os.path.dirname(os.path.abspath(__file__)),"users")
        user_path = os.path.join(users_root, "{}{}".format(user_message.auth.user.lower(), ".proto"))
        f = open(user_path, "wb")
        f.write(json_format.MessageToJson(user_message, use_integers_for_enums=True).encode())
        f.close()

    def delete_user(self, user_message):
        users_root = os.path.join(os.path.dirname(os.path.abspath(__file__)),"users")
        user_path = os.path.join(users_root, "{}{}".format(user_message.auth.user.lower(), ".proto"))
        os.remove(user_path)

    

    def delete_algorithm(self, user_message):
        users_root = os.path.join(os.path.dirname(os.path.abspath(__file__)),"users")
        user_path = os.path.join(users_root, "{}{}".format(user_message.auth.email.lower(), ".proto"))
        os.remove(user_path)
        
    def save_algorithm(self, websocket, user_message):
        fail_message = Message()
        fail_message.type = Message.SAVE_ALGORITHM
        fail_message.message = "Failed to save algorithm!"
        if not hasattr(websocket, 'user') or type(websocket.user) == type(None):
            fail_message.details = "Please use a valid account."
            asyncio.run_coroutine_threadsafe(websocket.send(fail_message.SerializeToString()), loop=self.loop)
            return
        
        exp = re.compile(r'[A-z0-9\ \#]*')
        if not exp.fullmatch(user_message.algorithm.name):
            fail_message.details = "Please choose a valid algorithm name. Please only use letters, numbers, spaces, underscores, and hashtags."
            asyncio.run_coroutine_threadsafe(websocket.send(fail_message.SerializeToString()), loop=self.loop)
            return

        algorithms_root = os.path.join(os.path.dirname(os.path.abspath(__file__)),"algorithms")

        algorithm_file_name = user_message.algorithm.name.lower().replace(" ","_")+".json"
        algorithm_file = os.path.join(algorithms_root, algorithm_file_name)

        if not os.path.commonpath((algorithms_root, algorithm_file)):
            fail_message.details = "Please choose a valid algorithm name."
            asyncio.run_coroutine_threadsafe(websocket.send(fail_message.SerializeToString()), loop=self.loop)
            return

        algorithm = None

        time_for_js = str(int(time.mktime(datetime.datetime.utcnow().timetuple())) * 1000)

        if os.path.exists(algorithm_file):
            f = open(algorithm_file, 'rb')
            file_contents = f.read()
            f.close()
            algorithm_json = json.loads(file_contents)
            if not 'owner' in algorithm_json or algorithm_json['owner'].lower() != websocket.user.auth.user.lower():
                fail_message.details = "You do not own this algorithm!"
                asyncio.run_coroutine_threadsafe(websocket.send(fail_message.SerializeToString()), loop=self.loop)
                return
            algorithm = user_message.algorithm
            #Make sure the user can't modify certain properties that were already saved:
            algorithm.owner = websocket.user.auth.user
            algorithm.views = algorithm_json['views'] if 'views' in algorithm_json else 0
            algorithm.created = algorithm_json['created'] if 'created' in algorithm_json else time_for_js
            algorithm.edited = time_for_js
            

            del algorithm.loves[:]
            algorithm.loves.extend(algorithm_json['loves'] if 'loves' in algorithm_json else [])

            del algorithm.hates[:]
            algorithm.hates.extend(algorithm_json['hates'] if 'hates' in algorithm_json else [])

            del algorithm.comments[:]
            algorithm.comments.extend(algorithm_json['comments'] if 'comments' in algorithm_json else [])


        else:
            algorithm = user_message.algorithm
            algorithm.owner = websocket.user.auth.user
            #Make sure the user can't initiate certain properties during creation:
            algorithm.views = 0
            algorithm.created = time_for_js
            algorithm.edited = time_for_js
            del algorithm.loves[:]
            algorithm.loves.extend([])
            del algorithm.hates[:]
            algorithm.hates.extend([])
            del algorithm.comments[:]
            algorithm.comments.extend([])

        f = open(algorithm_file, "wb")
        f.write(json_format.MessageToJson(algorithm).encode())
        f.close()

        result_message = Message()
        result_message.type = Message.SAVE_ALGORITHM
        result_message.message = "Successfully saved!"
        result_message.details = "You may now view \""+user_message.algorithm.name+"\" under your profile."
        result_message.algorithm.ParseFromString(algorithm.SerializeToString())
        asyncio.run_coroutine_threadsafe(websocket.send(result_message.SerializeToString()), loop=self.loop)


    def generate_captcha(self, digits):
        captcha_message = Message()
        captcha_message.type = Message.CAPTCHA
        key = str(math.floor(random.randrange((math.pow(10., digits-1)), (math.pow(10., digits)))))
        captcha = captcha_message.captcha
        captcha.key = key
        captcha.image = self.image_captcha.generate(key).getbuffer().tobytes()
        captcha.date = time.mktime(datetime.datetime.now().timetuple()) * 1000
        return captcha_message

    def send_captcha(self, websocket):
        captcha_message = self.generate_captcha(self.captcha_length)
        websocket.last_captcha = captcha_message.captcha
        captcha_message = Message()
        captcha_message.type = Message.CAPTCHA
        captcha_message.captcha.key = ""
        captcha_message.captcha.image = websocket.last_captcha.image
        captcha_message.captcha.date = websocket.last_captcha.date
        asyncio.run_coroutine_threadsafe(websocket.send(captcha_message.SerializeToString()), loop=self.loop)


    def send_websocket_auth(self, websocket, user):
        result_message = Message()
        self.delete_user(user)
        websocket.user = user
        key = str(math.floor(random.randrange(1E6, 1E7)))
        websocket.user.auth.hash = key
        websocket.last_hash = key

        self.write_user(websocket.user)

        result_message.type = Message.AUTH
        result_message.auth.user = websocket.user.auth.user
        result_message.auth.hash = websocket.user.auth.hash
        result_message = self.censor_user(result_message)

        asyncio.run_coroutine_threadsafe(websocket.send(result_message.SerializeToString()), loop=self.loop)


    def check_captcha(self, websocket, proto):
        maybe_key = proto.captcha.key

        result_message = Message()
            
        if not hasattr(websocket, 'last_captcha'):
            result_message.type = Message.ERROR
            result_message.message = "Invalid CAPTCHA!"
            result_message.details = "Please try again"
            asyncio.run_coroutine_threadsafe(websocket.send(result_message.SerializeToString()), loop=self.loop)
            self.send_captcha(websocket)
            return False

        last_captcha = websocket.last_captcha

        date = time.mktime(datetime.datetime.now().timetuple())
        last_captcha_date = last_captcha.date/1000.0
        delta_time = date-last_captcha_date

        if last_captcha.key != maybe_key:
            result_message.type = Message.ERROR
            result_message.message = "Invalid CAPTCHA!"
            result_message.details = "Please try again"
            asyncio.run_coroutine_threadsafe(websocket.send(result_message.SerializeToString()), loop=self.loop)
            self.send_captcha(websocket)
            return False

        elif delta_time > captcha_timeout:
            result_message.type = Message.ERROR
            result_message.message = "Expired CAPTCHA!"
            result_message.details = "Expired "+delta_time+" seconds ago. Please try again."
            asyncio.run_coroutine_threadsafe(websocket.send(result_message.SerializeToString()), loop=self.loop)
            self.send_captcha(websocket)
            return False

        return True



    def check_websocket_auth(self, websocket, maybe_hash, viciously):

        user = self.get_user_by_name(websocket.user.auth.user)

        if type(user) == type(None) or not user.auth.validated or maybe_hash != user.auth.hash:
            if viciously:
                result_message = Message()
                result_message.type = Message.ERROR
                result_message.message = "Invalid credentials."
                result_message.details = "This incident will be reported."
                asyncio.run_coroutine_threadsafe(websocket.send(result_message.SerializeToString()), loop=self.loop)
                self.send_captcha(websocket)
                asyncio.run_coroutine_threadsafe(websocket.close(), loop=self.loop)
            return False
        else:
            self.send_websocket_auth(websocket, user)
            return True

    def send_validation(self, websocket, name, email):

        try:
            captcha_message = self.generate_captcha(12)

            subject = 'Email Verification'
            localhost = 'MetaHumanity.xyz'
            sender_name = 'MetaHumanity.xyz'
            sender_email = 'MetaHuman@'+localhost

            receiver_name = name
            receiver_email = email

            message = MIMEMultipart('alternative')
            message['From'] = sender_name+""" <"""+sender_email+""">"""
            message['To'] = receiver_email
            message['Subject'] = subject

            text = """This is an automatically generated message from MetaHumanity.xyz to validate this email address.\n\n"""+\
            """If you believe you have received this email in error, then please disregard this message. Otherwise, use the link below to activate this email address as the primary email of your MetaHumanity.xyz account:\n\n"""+\
            localhost+"/?user="+receiver_name+"&code="+captcha_message.captcha.key+"#reset"
            
            html = """<html><head></head><body><p>This is an automatically generated message from MetaHumanity.xyz to validate this email address.</p>\n"""+\
            """<p>If you believe you have received this email in error, then please disregard this message. Otherwise, use the link below to activate this email address as the primary email of your MetaHumanity.xyz account:</p>\n"""+\
            """<h1><a href='https://www."""+localhost+"/?user="+quote(receiver_name, safe='')+"&code="+captcha_message.captcha.key+"#reset"+"""'>Activate</a></h1></body></html>"""

            part1 = MIMEText(text, 'plain')
            part2 = MIMEText(html, 'html')

            message.attach(part1)
            message.attach(part2)

            smtpObj = smtplib.SMTP('localhost',25)
            smtpObj.starttls()
            smtpObj.sendmail(sender_email, [receiver_email], message.as_string())
            return captcha_message
        except Exception as e: 
            print(str(e))
            result_message = Message()
            result_message.type = Message.ERROR
            result_message.message = "Error: unable to send validation email."
            result_message.details = str(e)
            asyncio.run_coroutine_threadsafe(websocket.send(result_message.SerializeToString()), loop=self.loop)
            self.send_captcha(websocket)
            return None

    def censor_user(self, user):
        user.auth.email = ""
        user.auth.password = ""
        return user