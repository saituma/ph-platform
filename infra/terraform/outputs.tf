output "alb_dns" {
  value = var.enable_compute_stack ? aws_lb.main[0].dns_name : null
}

output "ecr_repository_url" {
  value = var.enable_ecr ? aws_ecr_repository.api[0].repository_url : null
}

output "web_ecr_repository_url" {
  value = var.enable_ecr ? aws_ecr_repository.web[0].repository_url : null
}

output "ecs_cluster_name" {
  value = var.enable_compute_stack ? aws_ecs_cluster.main[0].name : null
}

output "ecs_web_service_name" {
  value = var.enable_compute_stack ? aws_ecs_service.web[0].name : null
}

output "ecs_migrate_task_definition" {
  value = var.enable_compute_stack ? aws_ecs_task_definition.api_migrate[0].arn : null
}

output "rds_endpoint" {
  value = var.enable_compute_stack ? aws_db_instance.main[0].address : null
}

output "database_secret_arn" {
  value = var.enable_compute_stack ? aws_secretsmanager_secret.database[0].arn : null
}

output "s3_bucket" {
  value = var.enable_media_stack ? aws_s3_bucket.media[0].bucket : null
}

output "cloudfront_domain" {
  value = var.enable_cloudfront ? aws_cloudfront_distribution.media[0].domain_name : null
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

output "ecs_security_group_id" {
  value = var.enable_compute_stack ? aws_security_group.ecs[0].id : null
}

output "cloudfront_key_id" {
  value = var.enable_cloudfront ? aws_cloudfront_public_key.media[0].id : null
}

output "cognito_user_pool_id" {
  value = var.enable_auth_stack ? aws_cognito_user_pool.main[0].id : null
}

output "cognito_client_id" {
  value = var.enable_auth_stack ? aws_cognito_user_pool_client.main[0].id : null
}

output "ec2_instance_id" {
  value = var.enable_ec2_instance ? aws_instance.cheap_web[0].id : null
}

output "ec2_public_ip" {
  value = var.enable_ec2_instance ? aws_instance.cheap_web[0].public_ip : null
}

output "ec2_public_dns" {
  value = var.enable_ec2_instance ? aws_instance.cheap_web[0].public_dns : null
}
