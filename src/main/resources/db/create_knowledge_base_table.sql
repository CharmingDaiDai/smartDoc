-- Create knowledge_base table for user-defined knowledge bases
CREATE TABLE IF NOT EXISTS `knowledge_base` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL COMMENT '用户ID',
  `name` varchar(255) NOT NULL COMMENT '知识库名称',
  `index_param` TEXT DEFAULT NULL COMMENT '知识库索引的配置参数',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='用户知识库表';