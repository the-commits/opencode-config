**Home > Semgrep Recipes**

**Siblings:** [[Plugins|Plugins]], [[Agent-Modes|Agent Modes]], [[Skills-and-Tools|Skills & Tools]], [[MCP-Servers|MCP Servers]], [[Security-and-Hooks|Security & Hooks]], [[Agent-Guidelines|Agent Guidelines]]

---

# Semgrep Security Recipes

**Directory:** `semgrep/recipes/`

## Light -- What They Are

The Semgrep recipes are a collection of **292 custom rules** across **15 YAML files** covering 11 language ecosystems. They are used by the [[Plugins-Supply-Chain-Guard|Supply Chain Guard]] plugin to automatically scan dependencies and project source code for supply chain backdoors, suspicious patterns, and outbound network calls.

The recipes serve as the detection engine for the entire security pipeline. They fall into three categories:

1. **Network Inventory** (WARNING) -- Detects any outbound network call. Purpose: audit the attack surface.
2. **Suspicious Patterns** (WARNING) -- Dangerous but potentially legitimate APIs (eval, exec, reflection).
3. **Backdoor Patterns** (ERROR) -- Specific attack signatures (base64+eval, env exfiltration, download+exec, reverse shells).

## Nitty-Gritty -- All 15 Recipe Files

### Architecture

Each recipe file targets a specific ecosystem and follows a consistent internal structure:

1. Network inventory rules (outbound HTTP, raw sockets, DNS)
2. Process execution rules
3. Dynamic code execution / reflection
4. Deserialization backdoors
5. Base64-obfuscated execution
6. Environment variable exfiltration

### Detection Techniques Used

| Technique | Description | Example |
|-----------|-------------|---------|
| **Single pattern** | Simple API call detection | `eval(...)` |
| **`pattern-either`** | Multiple variants of same technique | `eval(atob())` OR `eval(Buffer.from(base64))` |
| **Multi-pattern (taint-style)** | Variable assignment followed by use | base64 decode then eval |
| **`metavariable-regex`** | URL/string content matching | Discord webhook URL patterns |
| **`pattern-not`** | Exclude benign cases | Non-literal `import()` |
| **`pattern-inside`** | Sequence detection | Clipboard read then network request |

### Complete File Inventory

#### 1. `python-backdoor-detection.yaml` -- 32 rules
**Severity:** 6 ERROR, 26 WARNING
**Target:** Python (pip, pip3, poetry, pipenv, uv)
**Categories:**
- Outbound network: `requests`, `urllib`, `httpx`, `aiohttp`, `socket` (11 rules)
- Dynamic code: `eval()`, `exec()`, `compile()` (3 rules)
- Shell execution: `os.system`, `subprocess.run`, etc. (5 rules)
- Deserialization (ERROR): `pickle.loads/load`, `shelve.open` (3 rules) -- known RCE vectors
- Base64 obfuscated code (ERROR): `eval(base64.b64decode())`, taint-style compile+exec (3 rules)
- Dynamic import: `importlib.import_module`, `__import__()` (2 rules)
- Environment exfiltration (ERROR): `os.environ` captured then `requests.post()` (multi-pattern)

#### 2. `ruby-backdoor-detection.yaml` -- 29 rules
**Severity:** 5 ERROR, 24 WARNING
**Target:** Ruby (bundler, gem)
**Categories:**
- Outbound network: `Net::HTTP`, `HTTParty`, `Faraday`, `RestClient`, `TCPSocket` (10 rules)
- Dynamic code: `eval()`, `instance_eval()`, `send()` (4 rules)
- Shell execution: `system()`, `exec()`, `IO.popen()`, `Open3.capture3()` (4 rules)
- Backdoor (ERROR): `eval(Base64.decode64())`, `Marshal.load()`, `YAML.load()` (3 rules)
- Rails-specific: `render inline:` (SSTI), `String#constantize`, `safe_constantize` (3 rules)

**Notable:** The only recipe with framework-specific Rails rules. `Marshal.load()` is Ruby's insecure deserialization vector.

#### 3. `php-outbound-network-inventory.yaml` -- 29 rules
**Severity:** All WARNING
**Target:** PHP (composer)
**Categories:**
- cURL: `curl_init`, `curl_exec`, `curl_multi_exec` (3 rules)
- Stream wrappers: `file_get_contents()`, `fopen()`, `copy()` (3 rules)
- Raw sockets: `fsockopen`, `pfsockopen`, `socket_create`, `stream_socket_client` (5 rules)
- Guzzle: `new GuzzleHttp\Client`, `$client->request/get/post` (6 rules)
- WordPress HTTP API: `wp_remote_get`, `wp_remote_post`, `wp_remote_request` (3 rules)
- SOAP: `new SoapClient` (1 rule)
- DNS: `dns_get_record`, `gethostbyname`, `checkdnsrr` (3 rules)
- Mail: `mail()` (1 rule) -- outbound SMTP
- Symfony: `HttpClient::create()` (1 rule)

**Notable:** Covers PHP's ability to open URLs transparently via `file_get_contents()` and `fopen()`.

#### 4. `java-backdoor-detection.yaml` -- 26 rules
**Severity:** 6 ERROR, 20 WARNING
**Target:** Java/Kotlin (maven, gradle)
**Categories:**
- Outbound network: `URL.openConnection`, `HttpClient.send`, Apache HttpClient, OkHttp, Spring `RestTemplate`, Spring WebFlux `WebClient` (13 rules)
- Process execution: `Runtime.getRuntime().exec()`, `ProcessBuilder` (3 rules)
- Reflection: `Class.forName()`, `Method.invoke()`, `URLClassLoader` (3 rules)
- Deserialization (ERROR): `ObjectInputStream`, `readObject()` (2 rules)
- JNDI (ERROR): `Context.lookup()` -- Log4Shell-style (1 rule)
- Script engine: `ScriptEngine.eval()` (Nashorn/GraalJS) (1 rule)

#### 5. `c-cpp-backdoor-detection.yaml` -- 24 rules
**Severity:** All WARNING
**Target:** C, C++ (conan, vcpkg)
**Categories:**
- BSD sockets: `socket()`, `connect()`, `send()`, `sendto()`, `recv()` (5 rules)
- libcurl: `curl_easy_init/perform/setopt` (3 rules)
- Process execution: `system()`, `popen()`, `execve()`, `fork()` (5 rules)
- Dynamic library: `dlopen()`, `dlsym()`, `LoadLibrary()`, `GetProcAddress()` (4 rules)
- Shellcode (ERROR): `mmap()` with PROT_EXEC, `VirtualAlloc()` (2 rules)
- Boost.Asio (C++): `socket.connect()`, `resolver.resolve()` (2 rules)

**Notable:** The only recipe with explicit shellcode detection. Cross-platform: POSIX + Windows APIs.

#### 6. `csharp-backdoor-detection.yaml` -- 24 rules
**Severity:** 5 ERROR, 19 WARNING
**Target:** C#/.NET (dotnet, nuget)
**Categories:**
- HttpClient: `new HttpClient()`, `GetAsync/PostAsync/SendAsync` (5 rules)
- WebClient (legacy): `DownloadString/DownloadFile/UploadString` (4 rules)
- Socket-level: `new TcpClient()`, `new Socket()` (2 rules)
- Assembly loading: `Assembly.Load/LoadFrom/LoadFile` (3 rules)
- Dynamic compilation: `CSharpCodeProvider` (1 rule)
- Base64 assembly (ERROR): `Assembly.Load(Convert.FromBase64String(...))` (1 rule)
- Shell launch (ERROR): `Process.Start("powershell", ...)`, `Process.Start("cmd", ...)` (2 rules)
- Deserialization (ERROR): `BinaryFormatter` (1 rule)

#### 7. `go-backdoor-detection.yaml` -- 24 rules
**Severity:** 2 ERROR, 22 WARNING
**Target:** Go (go modules)
**Categories:**
- net/http: `http.Get/Post`, `http.Client.Do`, `http.NewRequest` (6 rules)
- Raw sockets: `net.Dial`, `net.DialTimeout`, `net.Listen` (3 rules)
- gRPC: `grpc.Dial`, `grpc.NewClient` (2 rules) -- unique across recipes
- Process: `exec.Command`, `exec.CommandContext` (2 rules)
- Plugin: `plugin.Open()` -- loading Go .so files (1 rule)
- CGo: `import "C"` -- FFI bypassing Go memory safety (1 rule)
- `init()` function: auto-runs on package import (1 rule) -- unique, common supply chain vector
- Download+exec (ERROR), env exfiltration (ERROR): 2 multi-pattern rules

#### 8. `outbound-network-inventory.yaml` -- 23 rules
**Severity:** All WARNING
**Target:** JavaScript, TypeScript
**Categories:**
- `fetch()` (1 rule)
- Dynamic imports: `import('node-fetch')`, `import('http')`, `import('https')` (3 rules)
- Static requires: `require('http/https/node-fetch/net/tls/dgram/dns')` (7 rules)
- `axios`: `axios()`, `axios.get/post/put/patch/delete` (6 rules)
- XHR: `XMLHttpRequest` (2 rules)
- WebSocket: `new WebSocket()` (1 rule)
- child_process: `require('child_process')` as proxy for curl/wget (1 rule)
- Suspicious: `eval()`, `new Function()` (2 rules)

#### 9. `js-ts-exfiltration-detection.yaml` -- 20 rules
**Severity:** 5 ERROR, 15 WARNING
**Target:** JavaScript, TypeScript
**Categories:**
- Chat webhooks (ERROR): Discord, Telegram Bot API, Slack (3 rules with `metavariable-regex`)
- Paste services: GitHub Gist API, Pastebin API (2 rules)
- DNS tunneling: `dns.resolveTxt` with dynamic hostname (1 rule)
- Clipboard exfiltration (ERROR): `navigator.clipboard.readText()` + `fetch()` (multi-pattern)
- File enumeration (ERROR): Recursive `readdir` + `fetch()` (multi-pattern)
- Anonymized channels: Tor, IPFS (2 rules)
- Encrypted messaging: WhatsApp, Matrix, Signal (4 rules)
- Protocol-based exfiltration: SSH, FTP/SFTP, IRC, MQTT, Redis (5 rules)
- Custom header exfiltration: `fetch()` with `x-data|x-payload|x-secret` headers (1 rule)

#### 10. `npm-backdoor-detection.yaml` -- 13 rules
**Severity:** 12 ERROR, 1 MEDIUM
**Target:** npm packages (node_modules/ scanning)
**Categories:**
- Credential exfiltration: `process.env` sent via HTTP/`fetch` (2 rules)
- Obfuscated code execution: `eval(Buffer.from(b64))`, variable decode→eval, `child_process.exec` with base64 (4 rules)
- SSH key theft: `fs.readFileSync($HOME + '/.ssh/$KEY')` (1 rule)
- DNS exfiltration: `dns.resolve` with `$DATA + '.' + $DOMAIN` (1 rule)
- Obfuscated URLs: `fetch(Buffer.from(b64))`, `fetch(atob())` (2 rules)
- Obfuscated requires: `require(Buffer.from(b64))` (1 rule)
- Reverse shell: `child_process.spawn('/bin/sh', ['-i'], ...)` (1 rule)
- Postinstall curl/wget: `execSync('curl ...')`, `execSync('wget ...')` (1 rule)

**Notable:** 12 of 13 rules are ERROR severity. Designed specifically for node_modules scanning. Covers real-world npm attacks (event-stream, ua-parser-js style).

#### 11. `php-backdoor-detection.yaml` -- 15 rules
**Severity:** 3 ERROR, 12 WARNING
**Target:** PHP (composer)
**Categories:**
- Dynamic code: `eval()`, `create_function()` (2 rules)
- Shell execution: `exec()`, `system()`, `shell_exec()`, `proc_open()`, `popen()` (6 rules)
- Base64 webshell (ERROR): `eval(base64_decode())` (1 rule)
- Env exfiltration (ERROR): `getenv()` → `curl_exec()` multi-pattern (1 rule)
- Webshell deployment (ERROR): `file_put_contents(... .php ...)` with regex on path (1 rule)
- Variable function calls: `$func(...)`, `call_user_func/array` (2 rules)
- Remote file inclusion: `include($var)`, `require($var)` (2 rules)

#### 12. `rust-backdoor-detection.yaml` -- 16 rules
**Severity:** 1 ERROR, 15 WARNING
**Target:** Rust (cargo)
**Categories:**
- reqwest: `reqwest::get()`, `reqwest::Client::new()`, `$client.get()`, `$client.post()` (4 rules)
- hyper: `hyper::Client::new()` (1 rule)
- Raw sockets: `TcpStream::connect()`, `UdpSocket::bind()` (2 rules)
- Process execution: `Command::new()`, `$cmd.output()`, `$cmd.spawn()` (3 rules)
- Unsafe: `unsafe { ... }` block -- bypasses Rust safety (1 rule)
- Dynamic library: `Library::new()` from `libloading` crate (1 rule)
- FFI: `extern "C" { ... }` block (1 rule)
- Dropper (ERROR): `reqwest::get().await` → `std::fs::write()` multi-pattern (1 rule)

#### 13. `js-ts-rat-detection.yaml` -- 6 rules
**Severity:** 3 ERROR, 3 WARNING
**Target:** JavaScript, TypeScript
**Categories:**
- Keylogger libraries (ERROR): `iohook`, `keylogger`, `node-key-sender` (1 rule)
- Screenshot capture (WARNING): `screenshot-desktop`, `node-screenshots` (1 rule)
- Microphone/camera (WARNING): `node-record-lpcm16`, `mic`, `node-webcam` (1 rule)
- Reverse shell (ERROR): `net.Socket().pipe(child_process.spawn('/bin/sh', ...))` (1 rule)
- Crypto mining (ERROR): `coin-hive`, `cryptocurrency-miner`, `node-cryptonight` (1 rule)
- Steganography (WARNING): `steganography`, `stegcloak`, `png-steg` (1 rule)

#### 14. `js-ts-obfuscation-detection.yaml` -- 6 rules
**Severity:** 3 ERROR, 3 WARNING
**Target:** JavaScript, TypeScript
**Categories:**
- Hex-encoded execution (ERROR): `eval(Buffer.from(hex))`, `exec(Buffer.from(hex))` (1 rule)
- String concatenation (WARNING): `require($A + $B)` -- hiding module names (1 rule)
- Global object access (WARNING): `global[$A + $B]()`, `globalThis[...]()`, `this[...]()` (1 rule)
- Dynamic import (WARNING): `import($VAR)` with negative pattern for string literals (1 rule)
- Compressed payload (ERROR): `zlib.inflateSync()` → `eval()` multi-pattern (1 rule)
- Multi-stage payload (ERROR): `await fetch()` → decrypt → `eval()` -- 3-hop taint chain (1 rule)

#### 15. `js-ts-persistence-detection.yaml` -- 5 rules
**Severity:** All ERROR
**Target:** JavaScript, TypeScript
**Categories:**
- Cron jobs: `exec('crontab ...')` or `writeFileSync` to `/etc/cron*` (1 rule)
- Shell profile modification: `appendFileSync/writeFileSync` to `.bashrc|.profile|.zshrc` (1 rule)
- Systemd service: `writeFileSync` to `/etc/systemd/system/` (1 rule)
- Self-replication: `fs.copyFileSync(__filename, ...)` -- worm behavior (1 rule)
- LOLBins: `exec/execSync` calling `certutil`, `mshta`, `bitsadmin`, `regsvr32`, `rundll32` (1 rule)

### How to Run Manual Scans

```bash
# JS/TS - node_modules
semgrep --config ~/.config/opencode/semgrep/recipes/ \
  --no-git-ignore \
  --exclude='!node_modules' \
  node_modules/

# PHP - vendor
semgrep --config ~/.config/opencode/semgrep/recipes/ \
  --no-git-ignore \
  --exclude='!vendor' \
  vendor/

# Project source (all ecosystems)
semgrep --config ~/.config/opencode/semgrep/recipes/ .
```

### Recipe Maturity

| Language | Status | Notes |
|----------|--------|-------|
| **JS/TS** | Stable | Tested against real-world projects, tuned for low noise |
| **PHP** | Stable | Tested against real-world projects, tuned for low noise |
| **C#** | Beta | Expect false positives |
| **Ruby** | Beta | Expect false positives |
| **Java** | Beta | Expect false positives |
| **Python** | Beta | Expect false positives |
| **Rust** | Beta | Expect false positives |
| **Go** | Beta | Expect false positives |
| **C/C++** | Beta | Expect false positives |
