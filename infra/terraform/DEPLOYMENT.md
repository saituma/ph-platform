# Deployment Guide

## Terraform (staging/prod)

```bash
cd infra/terraform
terraform init

terraform workspace new staging || terraform workspace select staging
terraform apply -var-file=envs/staging.tfvars

terraform workspace new prod || terraform workspace select prod
terraform apply -var-file=envs/prod.tfvars
```

## Cheap Mode (no compute/media/auth)

This disables the expensive parts of the stack (RDS, ECS/Fargate, ALB, S3/CloudFront, Cognito):

```bash
cd infra/terraform
terraform init
terraform workspace new cheap || terraform workspace select cheap
terraform apply -var-file=envs/cheap.tfvars
```

## Cheap EC2 + S3 Only

This keeps only S3 for media and runs a single free-tier EC2 instance (no RDS, ECS, ALB, CloudFront, Cognito):

```bash
cd infra/terraform
terraform init
terraform workspace new cheap-ec2 || terraform workspace select cheap-ec2
terraform apply -var-file=envs/cheap-ec2.tfvars
```

Requirements:
- Create an EC2 key pair named `football-coaching` (or update `ec2_key_name` in `envs/cheap-ec2.tfvars`).
- Use Nginx on the EC2 instance to reverse proxy to your app port (3000) and terminate TLS.

## GitHub Actions Secrets

Set these per-environment (staging/prod) in GitHub Actions environments:

- `AWS_ROLE_ARN`
- `AWS_REGION`
- `ECR_REPO` (output `ecr_repository_url`)
- `ECS_CLUSTER` (output `ecs_cluster_name`)
- `ECS_SERVICE` (`<project>-<env>-api`, from Terraform)
- `ECS_MIGRATE_TASK_DEF` (output `ecs_migrate_task_definition`)
- `ECS_SUBNETS` (comma-separated subnet IDs from output `private_subnet_ids`)
- `ECS_SECURITY_GROUP` (output `ecs_security_group_id`)

## Migrations

Migrations run via ECS one-off task in the deploy workflow. Ensure you generate migrations before deploying:

```bash
pnpm --filter api db:generate
```

Commit the generated migrations before deploy.
