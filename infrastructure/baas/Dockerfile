# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Dockerfile                                         :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2026/05/02 23:39:42 by dlesieur          #+#    #+#              #
#    Updated: 2026/05/04 00:37:09 by dlesieur         ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

# syntax=docker/dockerfile:1
FROM dlesieur/mini-baas-infra:smtp-v1

ENV MINI_BAAS_CONFIG_FILE=/etc/mini-baas/mini-baas-infra.conf
COPY --chmod=0644 config/mini-baas-infra.conf /etc/mini-baas/mini-baas-infra.conf

EXPOSE 8000 9999 5432 3001

USER 10001:10001
