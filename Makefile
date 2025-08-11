
VERSION ?= v0.9.0
IMAGE ?= armoin2018/copilot-skillset:$(VERSION)

.PHONY: build push run
build:
    docker build -t $(IMAGE) .

push:
    docker push $(IMAGE)

run:
    docker run --rm -p 8080:8080 --env-file .env -e PORT=8080 $(IMAGE)



tag-latest:
	docker tag $(IMAGE) armoin2018/copilot-skillset:latest

push-all: push tag-latest
	docker push armoin2018/copilot-skillset:latest
