# Terraform Deployments

This stack supports multi-environment deploys via `tfvars` and Terraform workspaces.

## Setup

```bash
cd infra/terraform
terraform init
```

## Staging

```bash
terraform workspace new staging || terraform workspace select staging
terraform apply -var-file=envs/staging.tfvars
```

## Production

```bash
terraform workspace new prod || terraform workspace select prod
terraform apply -var-file=envs/prod.tfvars
```

## Notes
- Replace placeholders in `envs/*.tfvars` before applying.
- Keep the private key value only in secure storage; do not commit real keys.
