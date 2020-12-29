
<h1>CrazedCoding.com Humanization Tool</h1>
<img src="./default.png">
<h2>About</h2>
<p>The sole purpose of this repo is to serve as a platform for the work of a friend of the author. So far, it is the culmination of a combination of academic and entrepreneurial projects developed over the past several years.</p>
</p>The main component is Linux-based python server. It is mainly designed to efficiently (de)serializes messages sent to/from the client/server using Google Protobufs. It has a email based sign-up system, and uses TCP/WebSockets to send/receive messages to/from the client/server. It is written for Python 3.7+ and it's requirements are listed in <a href="./requirements.txt">requirements.txt</a>.</p>
<p>The client is written in pure HTML/JavasSript and can be found in the <a href="./www">www</a> folder.</p>
<p>To use this project for your own domain/server, simply replace all occurances of the string "CrazedCoding.com" (while preserving the occurance's case) to your own server's domain name.</p>
<h2>Server Installation and Configuration</h2>
<p>We've gone through this process quite a few times, and have included a set of useful installation and debugging commands in <a href="https://github.com/CrazedCoding/CrazedCoding.com/blob/master/commands.md">commands.txt</a>. In particular, when setting up the postfix/dovecot email system, the following debug command always comes in useful:</p>
<code>tail -f /var/log/mail.log</code>
<br>
<br>
<p>Install git and clone this repository:</p>
<code>apt-get install git</code>
<br>
<code>git clone https://github.com/CrazedCoding/CrazedCoding.com.git</code>
<br>
<code>cd CrazedCoding.com</code>
<br>
<br>
<p> Follow the guide: <a href="https://upcloud.com/community/tutorials/secure-postfix-using-lets-encrypt/">How to secure Postfix using Let’s Encrypt</a> to configure postfix and dovetail for email verification.</p>
<br>
<code>sudo apt install postfix</code>
<br>
<code>sudo certbot certonly -d CrazedCoding.com -d www.CrazedCoding.com --expand</code>
<br>
<br>
<p> Follow the guide: <a href="https://github.com/protocolbuffers/protobuf/tree/master/src">How to Install the protoc Compiler</a> if you plan to modify and rebuild `www/proto/messages.proto`. You can use the following commands to generate the `messages_pb2.py` file used by the server:</p>
<code>protoc ./www/proto/messages.proto --python_out=./</code>
<br>
<code>mv ./www/proto/messages_pb2.py ./</code>
<br>
<br>
<p>Using python 3.6</p>
<code>sudo apt install python3-pip</code>
<code>sudo python3 -m pip install -r requirements.txt</code>
<br>
<br>
<p>If all goes well, then you should be able to start the server using the following command:</p>
<code>sudo python3 server.py</code>


