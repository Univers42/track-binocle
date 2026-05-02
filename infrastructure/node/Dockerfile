# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Dockerfile                                         :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2026/05/02 23:33:05 by dlesieur          #+#    #+#              #
#    Updated: 2026/05/03 00:45:26 by dlesieur         ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

FROM node:22-alpine

RUN apk add --no-cache python3 build-base cmake git bash \
	&& ln -sf /usr/bin/python3 /usr/bin/python \
	&& corepack enable \
	&& corepack prepare pnpm@10.32.1 --activate

WORKDIR /app
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["sleep", "infinity"]
