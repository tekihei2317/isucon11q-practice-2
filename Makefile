include env.sh

USER= isucon

NGINX_LOG=/var/log/nginx/access.log
MYSQL_LOG=/var/log/mysql/mysql-slow.log

# サービスの管理
reload-nginx:
	cat settings/nginx/nginx.conf | sudo tee /etc/nginx/nginx.conf > /dev/null
	sudo nginx -s reload

APP_SERVICE=TODO:
reload-app:
	sudo systemctl restart $(APP_SERVICE)
status-app:
	sudo systemctl status  $(APP_SERVICE)

MYSQL_SERVICE=TODO:
reload-mysql:
	cat settings/mysql/mysql.conf.d/mysqld.cnf | sudo tee /etc/mysql/mysql.conf.d/mysqld.cnf > /dev/null
	sudo systemctl restart $(MYSQL_SERVICE)

MYSQL_USER=isucon
MYSQL_PASSWORD=isucon
MYSQL_DATABASE=isucondition
enter-mysql:
	mysql -u $(MYSQL_USER) -p$(MYSQL_PASSWORD) -D $(MYSQL_DATABASE)

# 分析
ALPSORT=sum
ALPM="TODO:"
OUTFORMAT=count,method,uri,min,max,sum,avg,p99,1xx,2xx,3xx,4xx,5xx
.PHONY: alp
alp:
	sudo alp ltsv --file=$(NGINX_LOG) --sort $(ALPSORT) --reverse -o $(OUTFORMAT) -m $(ALPM)

pt-query-digest:
	sudo pt-query-digest $(MYSQL_LOG)

clear-logs:
	echo '' | sudo tee $(NGINX_LOG) > /dev/null
	echo '' | sudo tee $(MYSQL_LOG) > /dev/null

analyze:
	$(eval DIR := measurements/$(shell date +%Y%m%d-%H%M%S))
	mkdir -p $(DIR)
	@make alp > $(DIR)/alp.log
	@make pt-query-digest > $(DIR)/query.log

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
	sudo apt update && sudo apt install -y percona-toolkit jq net-tools

# 設定ファイルの取得、反映
check-server-id:
ifdef SERVER_ID
	@echo "SERVER_ID=$(SERVER_ID)"
else
	@echo "SERVER_ID is unset"
	@exit 1
endif

DB_CONF_PATH=/etc/mysql
get-db-conf:
	mkdir -p $(SERVER_ID)/$(DB_CONF_PATH)
	sudo cp -R $(DB_CONF_PATH)/* $(SERVER_ID)/$(DB_CONF_PATH)
