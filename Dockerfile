FROM node:latest
RUN npm -g i npm && mkdir -p /app/frontend/vuepress
WORKDIR /app
COPY ["package.json", "package-lock.json", "./"]
RUN npm install
COPY frontend/ ./frontend/
COPY data/docs/ ./data/docs/
RUN npm run install
RUN npm run build

FROM php:7.3-apache

ENV APACHE_DOCUMENT_ROOT /var/www/data/dist
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf && \
    sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

RUN a2enmod rewrite && \
    apt-get update && \
    apt-get install -y zip libzip-dev libfreetype6-dev libjpeg62-turbo-dev libpng-dev && \
    docker-php-ext-configure gd --with-freetype-dir=/usr/include/ --with-jpeg-dir=/usr/include/ && \
    docker-php-ext-install -j$(nproc) gd && \
    docker-php-ext-install zip && \
    curl -LSs https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

WORKDIR /var/www

COPY composer.json composer.lock ./
RUN composer install --no-ansi --no-dev --no-interaction --no-progress --no-scripts --optimize-autoloader

COPY backend/ ./backend/
COPY .env .
COPY --from=0 /app/data/dist /var/www/data/dist
RUN rm data/dist/index.html && \
    cp backend/web/.htaccess backend/web/index.php data/dist/
