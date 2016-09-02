# transparent_http_proxy
forward TCP connections through HTTP proxy


## stdio.js
Forward stdio through HTTP proxy to target host.
It's useful if you want to use ssh to connect to remote host through HTTP proxy.

### Usage
1. edit stdio.js. Set `cfg.proxy` to your HTTP proxy server address.
    ```
     host: "10.167.196.133",
     port: 8080
    ```

2. Write these lines into ~/.ssh/config
	```
Host choose_a_host_name
    PorxyCommand /usr/bin/node /path/to/stdio.js 1.2.3.4 22
	```

3. use `ssh choose_a_host_name` to connect to host through the HTTP proxy

## tcp.js
Forward tcp connection to remote host through HTTP proxy.

### Usage
1. copy `example.json` to `config.json`. And edit `config.json`.
    Format:
	```
    { "interactive": <true or false. Can user interactive with tcp.js. Set to false if you want tcp.js run as a daemon.>,
      "local": { 
        "listen": <port number or a filename. Which port should tcp.js listen on>
      },
      "target": {
        "host": <null or ip address. Which target host should tcp.js forward to. null means disable auto forward.>,
        "port": <number. Which target port should tcp.js forward to>
      },
      "proxy": {
        "host": <ip address. The server ip of HTTP proxy server>,
        "port": <port. The server port of HTTP proxy server>
      }
    }
	```
	
2. run `node tcp.js config.json`

3. let your application to connect to local listen port.


## Note
The HTTP proxy server **MUST** support "CONNECT" method.

## License
MIT License


