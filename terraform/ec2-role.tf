# IAM role that EC2 assumes to pull images from ECR
# the role itself ("flight-api-ec2-role")
resource "aws_iam_role" "ec2_role" {
  name = "flight-api-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

# the ECR pull permissions attached to that role
resource "aws_iam_role_policy" "ecr_pull" {
  name = "ecr-pull-policy"
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:GetAuthorizationToken"
      ]
      Resource = "*"
    }]
  })
}

# the wrapper that lets EC2 use the role
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "flight-api-ec2-profile"
  role = aws_iam_role.ec2_role.name
}
