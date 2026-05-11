# here we define the EC2 instance and security group

# Provider - which cloud to use: AWS. It reads our creds from aws configure automatically
provider "aws" {
  region = "us-east-1"
}

# Security Group - firewall rules

# - Creates a firewall. "flight_api" is the name Terraform uses internally to reference it. "flight-api-sg" is the name that shows up in AWS Console.
resource "aws_security_group" "flight_api" {
  name        = "flight-api-sg"
  description = "Allow SSH and API access"


  # Ingress = incoming traffic. Allow anyone (0.0.0.0/0 = the whole internet) to connect on port 22 (SSH). This is how we'll SSH into the server.
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow anyone to hit port 3000 — your API. Without this, Postman couldn't reach your flight API.
  ingress {
    description = "API"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Egress = outgoing traffic. Allow the server to make any outbound connections. It needs this to download Docker images, npm packages, etc. "-1" means all protocols, 0 to 0 means all ports.
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Key Pair — SSH access

# - Uploads our public SSH key to AWS. When the EC2 instance launches, it installs this key so only you can SSH in. file() reads the content of that file from your Mac.
resource "aws_key_pair" "deployer" {
  key_name   = "flight-api-key"
  public_key = file("~/.ssh/flight-api-key.pub")
}

# EC2 Instance — the server
resource "aws_instance" "flight_api" {
  ami                    = "ami-0c02fb55956c7d316"                  #ami — the base image (Amazon Linux 2). Like FROM node:20-alpine in Docker but for the whole server OS.
  instance_type          = "t3.micro"                               #instance_type — t3.micro is free tier (1 CPU, 1GB RAM)
  key_name               = aws_key_pair.deployer.key_name           #key_name — references the SSH key we created above
  vpc_security_group_ids = [aws_security_group.flight_api.id]       #vpc_security_group_ids — attaches the firewall rules we defined. Notice how it references aws_security_group.flight_api.id — Terraform connects them automatically.
  iam_instance_profile   = aws_iam_instance_profile.ec2_profile.name  # This tells AWS "when this EC2 boots, give it the permissions to pull from ECR automatically."

  tags = {                                                          #tags — the label you'll see in AWS Console
    Name = "flight-booking-api"
  }
}

# Output — show the IP after creation
output "server_ip" {
  value = aws_instance.flight_api.public_ip
}

# After terraform apply finishes, it prints the public IP address so you know where to find your server. Like console.log() but for Terraform.
