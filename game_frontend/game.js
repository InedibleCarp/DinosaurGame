class DinoRunScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DinoRunScene' });
    this.score = 0;
    this.isGameOver = false;
    this.gameSpeed = 200;
  }

  preload() {
    // Load assets here (make sure to add your assets in an "assets" folder)
    this.load.image('dino', 'assets/dino.png');       // Your dino image
    this.load.image('obstacle', 'assets/obstacle.png'); // Your obstacle image
    this.load.image('ground', 'assets/ground.png');   // Add a ground image
  }

  create() {
    // Create the ground
    this.ground = this.physics.add.staticGroup();
    this.ground.create(400, 350, 'ground').setScale(2).refreshBody();
    
    // Create the player (dino) sprite
    this.player = this.physics.add.sprite(100, 300, 'dino');
    this.player.setCollideWorldBounds(true);
    this.player.setGravityY(800);
    this.player.setOrigin(0.5, 1);

    // Add collision between player and ground
    this.physics.add.collider(this.player, this.ground);

    // Create a group for obstacles
    this.obstacles = this.physics.add.group();

    // Add keyboard input for jumping
    this.jumpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
    // Create score text
    this.scoreText = this.add.text(16, 16, 'Score: 0', { 
      fontSize: '24px', 
      fill: '#000' 
    });
    
    // Game over text (hidden initially)
    this.gameOverText = this.add.text(400, 200, 'GAME OVER', { 
      fontSize: '48px', 
      fill: '#ff0000',
      fontStyle: 'bold' 
    }).setOrigin(0.5);
    this.gameOverText.setVisible(false);
    
    this.restartText = this.add.text(400, 250, 'Press SPACE to restart', { 
      fontSize: '24px', 
      fill: '#000' 
    }).setOrigin(0.5);
    this.restartText.setVisible(false);
    
    // Spawn obstacles every 1.5-3 seconds (random)
    this.obstacleTimer = this.time.addEvent({
      delay: Phaser.Math.Between(1500, 3000),
      callback: this.spawnObstacle,
      callbackScope: this,
      loop: false
    });

    // Add collision between player and obstacles
    this.physics.add.collider(this.player, this.obstacles, this.hitObstacle, null, this);

    // Set up score incrementing
    this.scoreTimer = this.time.addEvent({
      delay: 100,
      callback: this.incrementScore,
      callbackScope: this,
      loop: true
    });
  }
  
  incrementScore() {
    if (!this.isGameOver) {
      this.score += 1;
      this.scoreText.setText('Score: ' + this.score);
      
      // Increase game speed over time
      if (this.score % 100 === 0) {
        this.gameSpeed += 20;
      }
    }
  }
  
  hitObstacle() {
    this.physics.pause();
    this.player.setTint(0xff0000);
    this.isGameOver = true;
    this.gameOverText.setVisible(true);
    this.restartText.setVisible(true);
    this.scoreTimer.remove();
    
    // Submit score to backend
    this.submitScore();
  }
  
  async submitScore() {
    try {
      const response = await fetch('http://127.0.0.1:8080/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Player', // Ideally get this from user input
          score: this.score
        })
      });
      
      if (response.ok) {
        console.log('Score submitted successfully!');
      }
    } catch (error) {
      console.error('Failed to submit score:', error);
    }
  }

  spawnObstacle() {
    if (this.isGameOver) return;
    
    // Create an obstacle sprite at the right edge of the screen
    const obstacle = this.obstacles.create(800, 310, 'obstacle');
    obstacle.setOrigin(0.5, 1);
    obstacle.setVelocityX(-this.gameSpeed);
    obstacle.setImmovable(true);
    
    // Schedule next obstacle
    this.obstacleTimer = this.time.addEvent({
      delay: Phaser.Math.Between(1500, 3000),
      callback: this.spawnObstacle,
      callbackScope: this,
      loop: false
    });
  }

  update() {
    // Jump only when on ground
    if (this.jumpKey.isDown && this.player.body.touching.down && !this.isGameOver) {
      this.player.setVelocityY(-500);
    }
    
    // Handle game restart
    if (this.isGameOver && this.jumpKey.isDown) {
      this.scene.restart();
      this.score = 0;
      this.isGameOver = false;
      this.gameSpeed = 200;
    }
    
    // Remove obstacles that have gone off screen
    this.obstacles.children.iterate((obstacle) => {
      if (obstacle && obstacle.x < -50) {
        obstacle.destroy();
      }
    });
  }
}

class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LeaderboardScene' });
  }
  
  create() {
    this.add.text(400, 50, 'LEADERBOARD', { 
      fontSize: '36px', 
      fill: '#000',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    this.backText = this.add.text(400, 500, 'Press SPACE to play again', { 
      fontSize: '24px', 
      fill: '#000' 
    }).setOrigin(0.5);
    
    this.loadLeaderboard();
    
    this.input.keyboard.addKey('SPACE').on('down', () => {
      this.scene.start('DinoRunScene');
    });
  }
  
  async loadLeaderboard() {
    try {
      const response = await fetch('http://127.0.0.1:8080/scores');
      if (response.ok) {
        const scores = await response.json();
        
        // Sort scores from highest to lowest
        scores.sort((a, b) => b.score - a.score);
        
        // Display top 10 scores
        const topScores = scores.slice(0, 10);
        topScores.forEach((scoreData, index) => {
          this.add.text(400, 120 + (index * 35), 
            `${index + 1}. ${scoreData.name}: ${scoreData.score}`, { 
            fontSize: '20px', 
            fill: '#000' 
          }).setOrigin(0.5);
        });
        
        if (scores.length === 0) {
          this.add.text(400, 200, 'No scores yet! Be the first!', { 
            fontSize: '20px', 
            fill: '#666' 
          }).setOrigin(0.5);
        }
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      this.add.text(400, 200, 'Could not load scores', { 
        fontSize: '20px', 
        fill: '#ff0000' 
      }).setOrigin(0.5);
    }
  }
}

class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }
  
  create() {
    // Title
    this.add.text(400, 150, 'DINO RUN', { 
      fontSize: '64px', 
      fill: '#000',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Play button
    const playButton = this.add.text(400, 250, 'PLAY', { 
      fontSize: '32px', 
      fill: '#000',
      backgroundColor: '#E0E0E0',
      padding: { left: 20, right: 20, top: 10, bottom: 10 }
    }).setOrigin(0.5).setInteractive();
    
    playButton.on('pointerdown', () => {
      this.scene.start('DinoRunScene');
    });
    
    // Leaderboard button
    const leaderboardButton = this.add.text(400, 320, 'LEADERBOARD', { 
      fontSize: '32px', 
      fill: '#000',
      backgroundColor: '#E0E0E0',
      padding: { left: 20, right: 20, top: 10, bottom: 10 }
    }).setOrigin(0.5).setInteractive();
    
    leaderboardButton.on('pointerdown', () => {
      this.scene.start('LeaderboardScene');
    });
    
    // Instructions
    this.add.text(400, 400, 'Press SPACE to jump', { 
      fontSize: '24px', 
      fill: '#000' 
    }).setOrigin(0.5);
    
    // Keyboard input as alternative
    this.input.keyboard.addKey('SPACE').on('down', () => {
      this.scene.start('DinoRunScene');
    });
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [MainMenuScene, DinoRunScene, LeaderboardScene]
};

const game = new Phaser.Game(config);