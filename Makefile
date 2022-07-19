include env.sh

USER=isucon

NGINX_LOG=/var/log/nginx/access.log
MYSQL_LOG=/var/log/mysql/mariadb-slow.log

# サービスの管理
reload-nginx:
	@make deploy-nginx-conf
	sudo nginx -s reload

APP_SERVICE=isucondition.nodejs.service
reload-app:
	cd nodejs && npm run build
	sudo systemctl restart $(APP_SERVICE)
status-app:
	sudo systemctl status $(APP_SERVICE)
watch-log-app:
	sudo journalctl -u $(APP_SERVICE) -n 10 -f 

MYSQL_SERVICE=mysql.service
reload-mysql:
	@make deploy-db-conf
	sudo systemctl restart $(MYSQL_SERVICE)
status-mysql:
	sudo systemctl status $(MYSQL_SERVICE)

MYSQL_USER=isucon
MYSQL_PASSWORD=isucon
MYSQL_DATABASE=isucondition
enter-mysql:
	mysql -u $(MYSQL_USER) -p$(MYSQL_PASSWORD) -D $(MYSQL_DATABASE)

# 計測・分析
clear-logs:
	echo '' | sudo tee $(NGINX_LOG) > /dev/null
	echo '' | sudo tee $(MYSQL_LOG) > /dev/null

before-bench: clear-logs reload-app watch-log-app

bench:
	cd ../bench && ./bench -all-addresses 127.0.0.11 -target 127.0.0.11:443 -tls -jia-service-url http://127.0.0.1:4999

ALPSORT=sum
ALPM="/api/condition/[0-9a-z-]+,/api/isu/[0-9a-z-]+/icon,/api/isu/[0-9a-z-],/isu/[0-9a-z-]+/condition,/isu/[0-9a-z-]+/graph,/isu/[0-9a-z-]+"
OUTFORMAT=count,method,uri,min,max,sum,avg,p99,1xx,2xx,3xx,4xx,5xx
.PHONY: alp
alp:
	sudo alp ltsv --file=$(NGINX_LOG) --sort $(ALPSORT) --reverse -o $(OUTFORMAT) -m $(ALPM)

pt-query-digest:
	sudo pt-query-digest $(MYSQL_LOG)

.SILENT:
flame-graph:
	$(eval latest_log := $(shell ls -tr nodejs/isolate-*.log | tail -n 1))
	node --prof-process --preprocess -j $(latest_log) | flamebearer > /dev/null
	cat flamegraph.html

show-analysis:
	http-server measurements

analyze:
	$(eval DIR := measurements/$(shell date +%Y%m%d-%H%M%S))
	mkdir -p $(DIR)
	@make alp > $(DIR)/alp.log
	@make pt-query-digest > $(DIR)/query.log
	@make flame-graph > $(DIR)/flamegraph.html

# ツールのインストール
setup-git:
	cd ~/.ssh && ssh-keygen -t rsa
	git config --global user.email tekihei2317@gmail.com
	git config --global user.name tekihei2317

install-alp:
	wget https://github.com/tkuchiki/alp/releases/download/v1.0.9/alp_linux_amd64.zip
	unzip alp_linux_amd64.zip
	sudo install alp /usr/local/bin/alp
	rm alp alp_linux_amd64.zip

setup:
	@make install-alp
	sudo apt update && sudo apt install -y percona-toolkit jq net-tools dstat graphviz
	npm install -g ts-node flamebearer http-server

# 設定ファイルの取得、反映
check-server-id:
ifdef SERVER_ID
	@echo "SERVER_ID=$(SERVER_ID)"
else
	@echo "SERVER_ID is unset"
	@exit 1
endif

NGINX_CONF_PATH=/etc/nginx
DB_CONF_PATH=/etc/mysql

get-nginx-conf:
	mkdir -p $(SERVER_ID)$(NGINX_CONF_PATH)
	sudo cp -R $(NGINX_CONF_PATH)/* $(SERVER_ID)$(NGINX_CONF_PATH)
	sudo chown -R $(USER) $(SERVER_ID)$(NGINX_CONF_PATH)

get-db-conf:
	mkdir -p $(SERVER_ID)$(DB_CONF_PATH)
	sudo cp -R $(DB_CONF_PATH)/* $(SERVER_ID)$(DB_CONF_PATH)
	sudo chown -R $(USER) $(SERVER_ID)$(DB_CONF_PATH)

deploy-nginx-conf:
	sudo cp -R $(SERVER_ID)$(NGINX_CONF_PATH)/* $(NGINX_CONF_PATH)

deploy-db-conf:
	sudo cp -R $(SERVER_ID)$(DB_CONF_PATH)/* $(DB_CONF_PATH)

# リクエスト
BASE_URL=http://localhost:3000

get-trend:
	curl $(BASE_URL)/api/trend
# 認証が必要なためエラーになる
get-condition:
	curl $(BASE_URL)/api/condition/3a8ae675-3702-45b5-b1eb-1e56e96738ea