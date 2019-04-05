# Frontend build
FROM node:latest AS frontend

# The user which will be recorded in the workdir export
RUN id www-data >/dev/null 2>&1 || useradd -s /usr/sbin/nologin -d /var/www www-data && \
    mkdir -p /var/www && chown -R www-data:www-data /var/www

# Install dependencies and create workspace directory
RUN apt-get update && \
    apt-get install -y git sudo && \
    npm -g i npm && \
    mkdir -p /workspace/frontend/vuepress && \
    chown -R www-data:www-data /workspace

# Setup workdir
WORKDIR /workspace

# Run npm
COPY ["package.json", "package-lock.json", "./"]
RUN sudo -u www-data npm ci

# Copy frontend application files and set correct permissions
COPY frontend/ ./frontend/
RUN chown -R www-data:www-data frontend/ && \
    find frontend/ -type d -exec chmod 755 {} \; && \
    find frontend/ -type f -exec chmod 644 {} \;

# Copy documentation files, Git history, and environment variables
COPY .git/ ./.git/
COPY data/docs/ ./data/docs/
COPY .env ./

# Set correct permissions and build the frontend
RUN rm -rf data/docs/.vuepress && \
    chown -R www-data:www-data .env data/docs/ && \
    chmod 644 .env && \
    find data/docs/ -type d -exec chmod 755 {} \; && \
    find data/docs/ -type f -exec chmod 644 {} \; && \
    sudo -u www-data npm run build

# Backend build
FROM php:7.3-cli-alpine AS backend

# The user which will be recorded in the workdir export
RUN id www-data >/dev/null 2>&1 || adduser -s /sbin/nologin -D -H www-data

# Install dependencies and create workspace directory
RUN apk --no-cache add git sudo libzip-dev && \
    docker-php-ext-install -j$(getconf _NPROCESSORS_ONLN) zip && \
    curl -LSs https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer && \
    mkdir /workspace && \
    chown www-data:www-data /workspace

# Setup workdir
WORKDIR /workspace

# Run Composer
COPY composer.json composer.lock ./
RUN sudo -u www-data composer install --no-interaction --no-progress --no-suggest --no-dev --ignore-platform-reqs --optimize-autoloader

# Copy backend application files
COPY backend/src/ ./backend/src/
COPY backend/web/ ./backend/web/

# Set correct permissions
RUN chown -R www-data:www-data . && \
    find . -type d -not -path './vendor/*' -exec chmod 755 {} \; && \
    find . -type f -not -path './vendor/*' -exec chmod 644 {} \;

# Build optimized autoloader and delete Composer files
RUN sudo -u www-data composer dump-autoload --optimize --classmap-authoritative --no-dev && \
    rm -f composer.*

# Final image
FROM php:7.3-apache

RUN apt-get update && \
    apt-get install -y libjpeg-dev libpng-dev libwebp-dev && \
    docker-php-ext-configure gd --with-jpeg-dir=/usr/include --with-png-dir=/usr/include --with-webp-dir=/usr/include && \
    docker-php-ext-install -j$(nproc) gd opcache && \
    sed -iE -e 's#/var/www/html#/var/www/data/dist#g' /etc/apache2/sites-available/*.conf && \
    sed -iE -e 's#/var/www/#/var/www/data/dist#g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf && \
    rm -rf /var/www/* && \
    a2enmod rewrite && \
    sed -E \
        -e 's#^[; ]*(expose_php) *=.*$#\1 = off#g' \
        -e 's#^[; ]*(session.cookie_httponly) *=.*$#\1 = 1#g' \
        -e 's#^[; ]*(session.name) *=.*$#\1 = VictronPressSession#g' \
        -e 's#^[; ]*(session.save_path) *=.*$#\1 = /var/www/data/sessions#g' \
        -e 's#^[; ]*(session.sid_length) *=.*$#\1 = 32#g' \
        -e 's#^[; ]*(session.use_strict_mode) *=.*$#\1 = 1#g' \
        /usr/local/etc/php/php.ini-production > /usr/local/etc/php/php.ini

WORKDIR /var/www

COPY --from=backend /workspace/backend/src/ ./backend/src/
COPY --from=backend /workspace/vendor/ ./vendor/
COPY --from=backend /workspace/backend/web/.htaccess /workspace/backend/web/index.php ./data/dist/
COPY .env ./
RUN mkdir -p data/sessions && \
    chmod 755 data data/sessions && \
    chown -R www-data:www-data .
COPY --from=frontend /workspace/data/dist/ ./data/dist/
RUN chown -R www-data:www-data data/dist
