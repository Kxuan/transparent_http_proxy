# transparent_http_proxy
forward TCP connection through HTTP proxy


## Usage
### stdio.js
1. edit stdio.js. Set `cfg.proxy` to your HTTP proxy server address.
`
9     host: "10.167.196.133",
10     port: 8080
`
2. Write these lines into ~/.ssh/config
`
Host choose_a_host_name
    PorxyCommand /usr/bin/node /path/to/stdio.js 1.2.3.4 22
`
3. use `ssh choose_a_host_name` to connect to host through the HTTP proxy

### tcp.js
1. edit stdio.js. Set `cfg.proxy` to your HTTP proxy server address.
`
     host: "10.167.196.133",
     port: 8080
`
2. run `node tcp.js <target_host> <target_port>`
   The `target_host` & `target_port` is the destination where you want to forward to.

3. command your application to connect to 127.0.0.1:9231


## Note
The HTTP proxy must support "CONNECT" method.

## License
MIT License

