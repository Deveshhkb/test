import { Container, Graphics, Sprite, Text ,Texture} from "pixi.js";
export class Profile extends Container {
  private profileImage: Sprite;
  private userName: Text;
  private userBalance: Text;

  constructor(imagePath: Texture, name: string, balance: number) {
    super();
    this.profileImage = new Sprite(imagePath);
    this.profileImage.anchor.set(0.5);
    this.profileImage.scale.set(0.5);

    const radius = this.profileImage.width / 2;
    const circleMask = new Graphics();

    circleMask.circle(0, 0, radius);
    circleMask.fill(0xffffff);

    circleMask.x = this.profileImage.x;
    circleMask.y = this.profileImage.y;

    this.profileImage.mask = circleMask;

    this.addChild(this.profileImage);
    this.addChild(circleMask);

    this.userName = new Text({ text: name, style: { fontFamily: "Arial", fontSize: 20, fill: 0xffffff, }});
    this.userName.anchor.set(0.5);
    this.userName.x = this.profileImage.x;
    this.userName.y = this.profileImage.y + this.profileImage.height /2 + 20; 
    this.addChild(this.userName);

    this.userBalance = new Text({ text: `Balance: ${balance}`, style: { fontFamily: "Arial", fontSize: 18, fill: 0x00ff00,}});
    this.userBalance.anchor.set(0.5);
    this.userBalance.x = this.profileImage.x;
    this.userBalance.y = this.userName.y + 30;
    this.addChild(this.userBalance);
  }

  public updateBalance(newBalance: number) {
    this.userBalance.text = `Balance: ${newBalance}`;
  }
}
