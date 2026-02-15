variable "aws_region" {
  type = string
  default = "eu-north-1"
}

variable "project_name" {
  type = string
  default = "football-coaching"
}

variable "environment" {
  type = string
  default = "prod"
}

variable "vpc_cidr" {
  type = string
  default = "10.20.0.0/16"
}

variable "public_subnet_cidrs" {
  type = list(string)
  default = ["10.20.1.0/24", "10.20.2.0/24"]
}

variable "private_subnet_cidrs" {
  type = list(string)
  default = ["10.20.101.0/24", "10.20.102.0/24"]
}

variable "db_name" {
  type = string
  default = "fitness_coaching"
}

variable "db_username" {
  type = string
  default = "appuser"
}

variable "db_password" {
  type = string
  sensitive = true
}

variable "app_image" {
  type = string
  default = ""
  validation {
    condition = var.enable_compute_stack ? length(var.app_image) > 0 : true
    error_message = "app_image must be set when enable_compute_stack is true."
  }
}

variable "app_port" {
  type = number
  default = 3000
}

variable "desired_count" {
  type = number
  default = 1
}

variable "web_image" {
  type = string
  default = ""
  validation {
    condition = var.enable_compute_stack ? length(var.web_image) > 0 : true
    error_message = "web_image must be set when enable_compute_stack is true."
  }
}

variable "web_desired_count" {
  type = number
  default = 1
}

variable "cloudfront_public_key" {
  type = string
  default = ""
  validation {
    condition = var.enable_cloudfront ? length(var.cloudfront_public_key) > 0 : true
    error_message = "cloudfront_public_key must be set when enable_cloudfront is true."
  }
}

variable "cloudfront_private_key" {
  type = string
  sensitive = true
  default = ""
  validation {
    condition = var.enable_cloudfront ? length(var.cloudfront_private_key) > 0 : true
    error_message = "cloudfront_private_key must be set when enable_cloudfront is true."
  }
}

variable "enable_compute_stack" {
  type = bool
  default = true
}

variable "enable_media_stack" {
  type = bool
  default = true
}

variable "enable_auth_stack" {
  type = bool
  default = true
}

variable "enable_ecr" {
  type = bool
  default = true
}

variable "enable_cloudfront" {
  type = bool
  default = true
}

variable "enable_ec2_instance" {
  type = bool
  default = false
}

variable "ec2_key_name" {
  type = string
  default = ""
  validation {
    condition = var.enable_ec2_instance ? length(var.ec2_key_name) > 0 : true
    error_message = "ec2_key_name must be set when enable_ec2_instance is true."
  }
}

variable "ec2_instance_type" {
  type = string
  default = "t3.micro"
}

variable "ec2_root_volume_gb" {
  type = number
  default = 20
}

variable "ssh_cidr" {
  type = string
  default = "0.0.0.0/0"
}

variable "web_cidr" {
  type = string
  default = "0.0.0.0/0"
}
