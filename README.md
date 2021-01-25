
<h1>CrazedCoding.com Humanization Tool</h1>
<img src="./default.png">
<h2>About</h2>
<p>The sole purpose of this repo is to serve as a platform for the work of the author. So far, it is the culmination of a combination of academic and entrepreneurial projects developed over the past decade.</p>
</p>The main component is Linux-based python server. It is mainly designed to efficiently (de)serializes messages sent to/from the client/server using Google Protobufs. It has a email based sign-up system, and uses TCP/WebSockets to send/receive messages to/from the front/back-end. It is written for Python 3.7+ and it's requirements are listed in <a href="./requirements.txt">requirements.txt</a>.</p>
<p>The client is written in pure HTML/JavasSript and can be found in the <a href="./www">www</a> folder.</p>
<p>To use this project for your own domain/server, simply replace all occurances of the string "CrazedCoding.com" (while preserving the occurance's case) to your own server's domain name.</p>

<h2>Server Installation and Configuration</h2>
<br>
<h2>Step 1: Fetch/extract FreeBSD Ports: </h2>
<p>Because freebsd is awesome: </p>
<code>sudo portsnap fetch</code>
<br>
<code>sudo portsnap extract</code>
<br>
<code>sudo pkg update -f</code>
<br>
<h2>Step 2: Install screen, python3/pip3, and git.... </h2>
<p>Here's some useful links for this part:</p>
<br>
<code>https://www.digitalocean.com/community/tutorials/how-to-install-git-on-freebsd-11-0</code>
<br>
<code>https://pillow.readthedocs.io/en/latest/installation.html</code>
<br>
<h1>Installation</h1>
<p>Is fairly painless...</p>
<h2>Step 3: Clone</h2>
<code>git clone https://github.com/CrazedCoding/CrazedCoding.com.git</code>
<br>
<code>cd CrazedCoding.com</code>
<br>
<code>sudo certbot certonly -d CrazedCoding.com --expand</code>
<br>
<br>
<h2>Step 4 (Optional): Modify/Update protobuf.js</h2>
<p> Modifying the protobuf files, and the client/server code for handling the new protocol, are the first steps to extending this project's functionality. Follow the guide: <a href="https://github.com/protocolbuffers/protobuf/tree/master/src">How to Install the protoc Compiler</a> if you plan to modify and rebuild `www/proto/messages.proto`. You can use the following commands to generate the `messages_pb2.py` file used by the server:</p>
<code>protoc ./www/proto/messages.proto --python_out=./</code>
<br>
<code>mv ./www/proto/messages_pb2.py ./</code>
<br>
<br>
<h2>Step 5: Install/Run</h2>
<p>Using python 3.6</p>
<code>sudo python3 -m pip install -r requirements.txt</code>
<br>
<br>
<p>If all goes well, then you should be able to start the server using the following command:</p>
<code>sudo python3 server.py</code>


