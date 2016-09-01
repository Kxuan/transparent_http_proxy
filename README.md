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
1. edit stdio.js. Set `cfg.proxy` to your HTTP proxy server address.
	```
     host: "10.167.196.133",
     port: 8080
	```
	
2. run `node tcp.js <target_host> <target_port>`
   The `target_host` & `target_port` is the destination where you want to forward to.

3. let your application to connect to 127.0.0.1:9231


## Note
The HTTP proxy server **MUST** support "CONNECT" method.

## License
MIT License


