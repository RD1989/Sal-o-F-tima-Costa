-- ============================================================
-- SALÃO FÁTIMA COSTA — Schema do Banco de Dados (MySQL 8+)
-- Estruturado para futura integração com aplicação Desktop (Electron)
-- Suporta listeners em tempo real via polling + timestamps
-- ============================================================

CREATE DATABASE IF NOT EXISTS `salao_fatima_costa`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `salao_fatima_costa`;

-- ------------------------------------------------------------
-- 1. CATEGORIAS DE SERVIÇOS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `categorias` (
    `id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nome`        VARCHAR(100) NOT NULL,
    `descricao`   TEXT,
    `emoji`       VARCHAR(10),
    `ativo`       TINYINT(1) NOT NULL DEFAULT 1,
    `ordem`       INT NOT NULL DEFAULT 0,
    `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2. SERVIÇOS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `servicos` (
    `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `categoria_id`  INT UNSIGNED NOT NULL,
    `nome`          VARCHAR(150) NOT NULL,
    `descricao`     TEXT,
    `duracao_min`   INT NOT NULL DEFAULT 60 COMMENT 'Duração em minutos',
    `preco`         DECIMAL(10,2) DEFAULT NULL COMMENT 'NULL = a consultar',
    `preco_texto`   VARCHAR(50) DEFAULT NULL COMMENT 'Ex: A partir de R$ 120',
    `ativo`         TINYINT(1) NOT NULL DEFAULT 1,
    `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. PROFISSIONAIS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `profissionais` (
    `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nome`          VARCHAR(150) NOT NULL,
    `especialidade` VARCHAR(200),
    `foto_url`      VARCHAR(500),
    `telefone`      VARCHAR(20),
    `ativo`         TINYINT(1) NOT NULL DEFAULT 1,
    `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de relacionamento: quais serviços cada profissional realiza
CREATE TABLE IF NOT EXISTS `profissional_servicos` (
    `profissional_id` INT UNSIGNED NOT NULL,
    `servico_id`      INT UNSIGNED NOT NULL,
    PRIMARY KEY (`profissional_id`, `servico_id`),
    FOREIGN KEY (`profissional_id`) REFERENCES `profissionais`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`servico_id`)      REFERENCES `servicos`(`id`)       ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. CLIENTES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `clientes` (
    `id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nome`        VARCHAR(200) NOT NULL,
    `telefone`    VARCHAR(20) NOT NULL,
    `email`       VARCHAR(200) DEFAULT NULL,
    `observacoes` TEXT,
    `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_telefone` (`telefone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5. AGENDAMENTOS (Core da aplicação)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `agendamentos` (
    `id`               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `cliente_id`       INT UNSIGNED NOT NULL,
    `servico_id`       INT UNSIGNED NOT NULL,
    `profissional_id`  INT UNSIGNED DEFAULT NULL COMMENT 'NULL = qualquer disponível',
    `data_hora`        DATETIME NOT NULL,
    `data_hora_fim`    DATETIME NOT NULL COMMENT 'Calculado: data_hora + duracao_min',
    `status`           ENUM('pendente','confirmado','em_andamento','concluido','cancelado','faltou')
                       NOT NULL DEFAULT 'pendente',
    `origem`           ENUM('site','whatsapp','telefone','presencial','sistema_desktop')
                       NOT NULL DEFAULT 'site',
    `observacoes`      TEXT,
    `whatsapp_link`    TEXT COMMENT 'Link gerado para confirmação',
    `confirmado_em`    DATETIME DEFAULT NULL,
    `notificado_em`    DATETIME DEFAULT NULL COMMENT 'Quando o pop-up apareceu no sistema desktop',
    `created_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (`cliente_id`)      REFERENCES `clientes`(`id`)       ON DELETE RESTRICT,
    FOREIGN KEY (`servico_id`)      REFERENCES `servicos`(`id`)        ON DELETE RESTRICT,
    FOREIGN KEY (`profissional_id`) REFERENCES `profissionais`(`id`)   ON DELETE SET NULL,

    INDEX `idx_data_hora`            (`data_hora`),
    INDEX `idx_status`               (`status`),
    INDEX `idx_profissional_data`    (`profissional_id`, `data_hora`),
    INDEX `idx_created_at`           (`created_at`),
    INDEX `idx_notificado`           (`notificado_em`) COMMENT 'Para polling do sistema desktop'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 6. BLOQUEIOS DE DISPONIBILIDADE (Folgas, Férias, etc.)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `disponibilidade_bloqueada` (
    `id`                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `profissional_id`   INT UNSIGNED DEFAULT NULL COMMENT 'NULL = bloqueia todos',
    `data_hora_inicio`  DATETIME NOT NULL,
    `data_hora_fim`     DATETIME NOT NULL,
    `motivo`            VARCHAR(200),
    `created_at`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`profissional_id`) REFERENCES `profissionais`(`id`) ON DELETE CASCADE,
    INDEX `idx_periodo` (`data_hora_inicio`, `data_hora_fim`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 7. LOG DE NOTIFICAÇÕES (Para integração Desktop real-time)
-- Permite que o app Electron faça polling eficiente
-- Endpoint: GET /api/agendamentos/novos?desde=TIMESTAMP&api_key=XXX
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notificacoes_desktop` (
    `id`              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `agendamento_id`  INT UNSIGNED NOT NULL,
    `tipo`            ENUM('novo','confirmado','cancelado','lembrete') NOT NULL DEFAULT 'novo',
    `lida`            TINYINT(1) NOT NULL DEFAULT 0,
    `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`agendamento_id`) REFERENCES `agendamentos`(`id`) ON DELETE CASCADE,
    INDEX `idx_nao_lidas` (`lida`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- DADOS INICIAIS (SEED)
-- ============================================================

-- Categorias
INSERT IGNORE INTO `categorias` (`id`, `nome`, `descricao`, `emoji`, `ordem`) VALUES
(1, 'Coloração',              'Loiro, luzes, mechas, balayage e colorações completas', '🎨', 1),
(2, 'Cortes',                 'Design de cortes femininos premium',                   '✂️', 2),
(3, 'Dia da Noiva',           'Pacotes exclusivos para noivas',                       '👰', 3),
(4, 'Escova & Finalização',   'Escova tradicional, progressiva e acabamento',         '💨', 4),
(5, 'Tratamentos',            'Hidratação, nutrição, botox capilar',                  '✨', 5),
(6, 'Sobrancelha & Maquiagem','Design de sobrancelha e make social/festa',            '🖌️', 6);

-- Serviços
INSERT IGNORE INTO `servicos` (`id`, `categoria_id`, `nome`, `duracao_min`, `preco_texto`) VALUES
(1,  1, 'Loiro Platinado',         240, 'A consultar'),
(2,  1, 'Mechas / Luzes',          180, 'A partir de R$ 180'),
(3,  1, 'Coloração Completa',       90, 'A partir de R$ 120'),
(4,  1, 'Balayage / Ombré',        210, 'A consultar'),
(5,  1, 'Retoque de Raiz',          60, 'A partir de R$ 80'),
(6,  2, 'Corte Feminino',           60, 'A partir de R$ 70'),
(7,  2, 'Corte + Escova',           90, 'A partir de R$ 110'),
(8,  2, 'Franja',                   20, 'R$ 30'),
(9,  3, 'Penteado Noiva',          120, 'A consultar'),
(10, 3, 'Pacote Dia da Noiva',     360, 'A consultar'),
(11, 3, 'Teste de Penteado',        90, 'A consultar'),
(12, 4, 'Escova Tradicional',       60, 'A partir de R$ 60'),
(13, 4, 'Escova Progressiva',      180, 'A partir de R$ 200'),
(14, 4, 'Finalização',              45, 'A partir de R$ 50'),
(15, 5, 'Hidratação Intensiva',     60, 'A partir de R$ 80'),
(16, 5, 'Cronograma Capilar',      120, 'A partir de R$ 150'),
(17, 5, 'Nutrição com Botox',      120, 'A partir de R$ 180'),
(18, 6, 'Design de Sobrancelha',    30, 'R$ 25'),
(19, 6, 'Maquiagem Social',         60, 'A partir de R$ 80'),
(20, 6, 'Maquiagem de Festa',       90, 'A partir de R$ 120');

-- Profissional principal
INSERT IGNORE INTO `profissionais` (`id`, `nome`, `especialidade`) VALUES
(1, 'Fátima Costa',    'Colorimetria, Design de Cortes, Noivas, Escova de Excelência');
