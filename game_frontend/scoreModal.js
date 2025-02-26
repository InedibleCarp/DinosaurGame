// scoreModal.js - Modified for non-module use
class ScoreModal {
    constructor(scene, score) {
      this.scene = scene;
      this.score = score;
      this.playerName = "";
      this.isOpen = false;
      this.submitted = false;
    }
    
    open() {
      if (this.isOpen) return;
      this.isOpen = true;
      
      // Semi-transparent background
      this.overlay = this.scene.add.rectangle(0, 0, 
        this.scene.cameras.main.width, 
        this.scene.cameras.main.height, 
        0x000000, 0.7);
      this.overlay.setOrigin(0);
      
      // Modal background
      this.modal = this.scene.add.rectangle(400, 300, 400, 300, 0xffffff);
      this.modal.setOrigin(0.5);
      
      // Title
      this.titleText = this.scene.add.text(400, 180, 'GAME OVER', { 
        fontSize: '36px', 
        fill: '#ff0000',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      
      // Score display
      this.scoreText = this.scene.add.text(400, 230, `Your score: ${this.score}`, { 
        fontSize: '24px', 
        fill: '#000'
      }).setOrigin(0.5);
      
      // Input field background
      this.inputBg = this.scene.add.rectangle(400, 280, 250, 40, 0xeeeeee);
      this.inputBg.setOrigin(0.5);
      this.inputBg.setInteractive();
      
      // Input field label (initially placeholder)
      this.inputText = this.scene.add.text(400, 280, 'Enter your name...', { 
        fontSize: '20px', 
        fill: '#999'
      }).setOrigin(0.5);
      
      // Listen for keyboard input
      this.scene.input.keyboard.on('keydown', this.handleKeyDown, this);
      
      // Submit button
      this.submitButton = this.scene.add.rectangle(400, 340, 150, 40, 0x4CAF50);
      this.submitButton.setOrigin(0.5);
      this.submitButton.setInteractive();
      
      this.submitText = this.scene.add.text(400, 340, 'SUBMIT', { 
        fontSize: '20px', 
        fill: '#fff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      
      // Make submit button interactive
      this.submitButton.on('pointerdown', this.submit, this);
      
      // Activate input field on click
      this.inputBg.on('pointerdown', () => {
        if (this.inputText.text === 'Enter your name...') {
          this.inputText.setText('');
          this.inputText.setFill('#000');
        }
      });
      
      // Focus the input field by default
      if (this.inputText.text === 'Enter your name...') {
        this.inputText.setText('');
        this.inputText.setFill('#000');
      }
    }
    
    handleKeyDown(event) {
      if (!this.isOpen || this.submitted) return;
      
      // Handle backspace
      if (event.keyCode === 8 && this.playerName.length > 0) {
        this.playerName = this.playerName.slice(0, -1);
      } 
      // Handle enter key (submit)
      else if (event.keyCode === 13) {
        this.submit();
        return;
      }
      // Handle regular characters
      else if (event.key.length === 1 && this.playerName.length < 15) {
        this.playerName += event.key;
      }
      
      // Update the displayed text
      this.inputText.setText(this.playerName || 'Enter your name...');
      this.inputText.setFill(this.playerName ? '#000' : '#999');
    }
    
    async submit() {
      if (this.submitted) return;
      
      // Use a default name if none provided
      const name = this.playerName || 'Anonymous';
      
      try {
        // Submit the score to the backend
        const response = await fetch('http://127.0.0.1:8080/score', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: name,
            score: this.score
          })
        });
        
        if (response.ok) {
          this.submitted = true;
          
          // Show success message
          if (this.submitText) this.submitText.destroy();
          if (this.submitButton) {
            this.submitButton.setFillStyle(0x666666);
            this.submitButton.disableInteractive();
          }
          
          this.successText = this.scene.add.text(400, 340, 'Score submitted!', { 
            fontSize: '20px', 
            fill: '#4CAF50',
            fontStyle: 'bold'
          }).setOrigin(0.5);
          
          // Add view leaderboard button
          this.leaderboardButton = this.scene.add.rectangle(400, 390, 250, 40, 0x2196F3);
          this.leaderboardButton.setOrigin(0.5);
          this.leaderboardButton.setInteractive();
          
          this.leaderboardText = this.scene.add.text(400, 390, 'VIEW LEADERBOARD', { 
            fontSize: '20px', 
            fill: '#fff',
            fontStyle: 'bold'
          }).setOrigin(0.5);
          
          this.leaderboardButton.on('pointerdown', () => {
            this.close();
            this.scene.scene.start('LeaderboardScene');
          });
        }
      } catch (error) {
        console.error('Failed to submit score:', error);
        
        // Show error message
        this.errorText = this.scene.add.text(400, 370, 'Error: Could not submit score', { 
          fontSize: '16px', 
          fill: '#ff0000'
        }).setOrigin(0.5);
      }
    }
    
    close() {
      if (!this.isOpen) return;
      
      // Clean up listeners
      this.scene.input.keyboard.off('keydown', this.handleKeyDown, this);
      
      // Destroy all UI elements
      this.overlay.destroy();
      this.modal.destroy();
      this.titleText.destroy();
      this.scoreText.destroy();
      this.inputBg.destroy();
      this.inputText.destroy();
      if (this.submitButton) this.submitButton.destroy();
      if (this.submitText) this.submitText.destroy();
      if (this.successText) this.successText.destroy();
      if (this.errorText) this.errorText.destroy();
      if (this.leaderboardButton) this.leaderboardButton.destroy();
      if (this.leaderboardText) this.leaderboardText.destroy();
      
      this.isOpen = false;
    }
  }