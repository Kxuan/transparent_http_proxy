var net=require('net');
var util=require('util');
var cfg = {
  target: {
    host: process.argv[2],
    port: process.argv[3]
  },
  proxy: {
    host: "10.167.196.133",
    port: 8080
  }
}


var s = net.connect(cfg.proxy.port, cfg.proxy.host, onconnected);
s.once('data', ondata);
s.on('close', function() {
    console.error("Proxy: closed");
    process.exit(0);
});

function onconnected() {
    var req_body;
    req_body = util.format("CONNECT %s:%d\n", cfg.target.host, cfg.target.port);
    s.write(req_body);
}
function ondata(buf) {
    var rep = buf.toString('ascii');
    if (rep != "HTTP/1.1 200 Connection established\r\n\r\n") {
        console.error("Proxy: fail.");
        s.end();
        return;
    }
    console.error("Proxy: Connection established!");
    s.pipe(process.stdout);
    process.stdin.pipe(s);
}
