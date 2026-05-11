# ECR Repository - Docker image registry
resource "aws_ecr_repository" "flight_api" {
  name = "flight-booking-api"                  # The name that shows up in AWS Console. This becomes part of the URL where Docker images are stored.

  image_scanning_configuration {
    scan_on_push = true                         # Every time you push a Docker image, AWS automatically scans it for known security vulnerabilities (outdated packages, CVEs). Free and good practice.
  }

  force_delete = true                           # Normally AWS won't let you delete an ECR repo if it has images in it. This overrides that — useful when you run terraform destroy to clean up.
}

output "ecr_url" {
  value = aws_ecr_repository.flight_api.repository_url          #After terraform apply, prints the ECR URL.  It'll look something like: 107422471392.dkr.ecr.us-east-1.amazonaws.com/flight-booking-api. This is the address GitHub Actions will push images to, and EC2 will pull images from. Like Docker Hub but hosted in your AWS account.
}
