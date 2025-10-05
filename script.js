class Polygon {
    constructor() {
        this.vertices = [];
        this.color = this.getRandomColor();
        this.completed = false;
    }
    
    getRandomColor() {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    containsPoint(x, y) {
        if (this.vertices.length < 3) return false;
        
        let inside = false;
        for (let i = 0, j = this.vertices.length - 1; i < this.vertices.length; j = i++) {
            const xi = this.vertices[i].x, yi = this.vertices[i].y;
            const xj = this.vertices[j].x, yj = this.vertices[j].y;
            
            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }
    
    classifyPointToEdge(point, edgeStart, edgeEnd) {
        const dx = edgeEnd.x - edgeStart.x;
        const dy = edgeEnd.y - edgeStart.y;
        const px = point.x - edgeStart.x;
        const py = point.y - edgeStart.y;
        const cross = dx * py - dy * px;
        
        return cross > 0 ? 'left' : cross < 0 ? 'right' : 'on';
    }
    
    draw(ctx, highlight = false, edgeCheck = null) {
        if (this.vertices.length === 0) return;
        
        ctx.save();
        ctx.strokeStyle = highlight ? '#FF0000' : this.color;
        ctx.lineWidth = highlight ? 4 : 2;
        ctx.fillStyle = this.color + (highlight ? '80' : '40');
        
        ctx.beginPath();
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        for (let i = 1; i < this.vertices.length; i++) {
            ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        }
        
        if (this.completed && this.vertices.length > 2) {
            ctx.closePath();
            ctx.fill();
        }
        ctx.stroke();
        
        ctx.fillStyle = highlight ? '#FF0000' : this.color;
        for (let vertex of this.vertices) {
            ctx.beginPath();
            ctx.arc(vertex.x, vertex.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        if (edgeCheck && this.vertices[edgeCheck.edgeIndex]) {
            const i = edgeCheck.edgeIndex;
            const j = (i + 1) % this.vertices.length;
            const start = this.vertices[i];
            const end = this.vertices[j];
            
            ctx.strokeStyle = '#FFA500';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            
            if (edgeCheck.point) {
                const position = this.classifyPointToEdge(edgeCheck.point, start, end);
                ctx.fillStyle = '#000';
                ctx.font = '14px Arial';
                ctx.fillText(position === 'left' ? 'Слева' : position === 'right' ? 'Справа' : 'На линии', 
                           edgeCheck.point.x + 10, edgeCheck.point.y - 10);
            }
        }
        
        ctx.restore();
    }
}

class PolygonApp {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.polygons = [];
        this.currentPolygon = null;
        this.checkMode = false;
        this.edgeCheckMode = false;
        this.testPoint = null;
        this.highlightedPolygons = [];
        this.edgeCheckData = null;
        
        this.resizeCanvas();
        this.setupEvents();
        this.updateUI();
        this.draw();
    }
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = 600;
    }
    
    setupEvents() {
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.draw();
        });
        
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        
        const buttons = ['newPolygon', 'clearAll', 'completePolygon', 'deleteLast', 'checkPoint', 'checkEdge'];
        buttons.forEach(id => {
            document.getElementById(id).addEventListener('click', () => this[id]());
        });
    }
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
            y: (e.clientY - rect.top) * (this.canvas.height / rect.height)
        };
    }
    
    handleClick(e) {
        const pos = this.getMousePos(e);
        if (pos.x < 0 || pos.x > this.canvas.width || pos.y < 0 || pos.y > this.canvas.height) return;
        
        if (this.checkMode) {
            this.testPoint = pos;
            this.highlightedPolygons = this.polygons.filter(p => 
                p.completed && p.vertices.length >= 3 && p.containsPoint(pos.x, pos.y)
            );
            this.edgeCheckData = null;
        } else if (this.edgeCheckMode) {
            this.testPoint = pos;
            this.checkEdgeForPoint();
        } else {
            if (!this.currentPolygon) this.startNewPolygon();
            this.currentPolygon.vertices.push(pos);
        }
        this.updateUI();
        this.draw();
    }
    
    checkEdgeForPoint() {
        if (!this.testPoint) return;
        
        let minDistance = Infinity;
        let closestEdge = null;
        
        for (let polygon of this.polygons) {
            if (!polygon.completed || polygon.vertices.length < 2) continue;
            
            for (let i = 0; i < polygon.vertices.length; i++) {
                const j = (i + 1) % polygon.vertices.length;
                const start = polygon.vertices[i];
                const end = polygon.vertices[j];
                
                const dx = end.x - start.x;
                const dy = end.y - start.y;
                const t = ((this.testPoint.x - start.x) * dx + (this.testPoint.y - start.y) * dy) / (dx * dx + dy * dy);
                const closest = t < 0 ? start : t > 1 ? end : {
                    x: start.x + t * dx,
                    y: start.y + t * dy
                };
                const distance = Math.hypot(this.testPoint.x - closest.x, this.testPoint.y - closest.y);
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestEdge = { polygon, edgeIndex: i, point: this.testPoint };
                }
            }
        }
        
        this.edgeCheckData = closestEdge;
    }
    
    newPolygon() {
        if (this.currentPolygon && this.currentPolygon.vertices.length > 0) {
            this.currentPolygon.completed = true;
            this.polygons.push(this.currentPolygon);
        }
        this.currentPolygon = new Polygon();
        this.updateUI();
        this.draw();
    }
    
    completePolygon() {
        if (this.currentPolygon && this.currentPolygon.vertices.length >= 1) {
            this.currentPolygon.completed = true;
            this.polygons.push(this.currentPolygon);
            this.currentPolygon = null;
            this.updateUI();
            this.draw();
        }
    }
    
    deleteLast() {
        if (this.currentPolygon && this.currentPolygon.vertices.length > 0) {
            this.currentPolygon.vertices.pop();
            this.updateUI();
            this.draw();
        }
    }
    
    clearAll() {
        this.polygons = [];
        this.currentPolygon = null;
        this.checkMode = false;
        this.edgeCheckMode = false;
        this.testPoint = null;
        this.highlightedPolygons = [];
        this.edgeCheckData = null;
        this.updateUI();
        this.draw();
    }
    
    checkPoint() {
        this.checkMode = !this.checkMode;
        this.edgeCheckMode = false;
        this.testPoint = null;
        this.highlightedPolygons = [];
        this.edgeCheckData = null;
        this.updateUI();
        this.draw();
    }
    
    checkEdge() {
        this.edgeCheckMode = !this.edgeCheckMode;
        this.checkMode = false;
        this.testPoint = null;
        this.highlightedPolygons = [];
        this.edgeCheckData = null;
        this.updateUI();
        this.draw();
    }
    
    draw() {
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.polygons.forEach(p => {
            p.draw(this.ctx, this.highlightedPolygons.includes(p), 
                  this.edgeCheckData?.polygon === p ? this.edgeCheckData : null);
        });
        
        if (this.currentPolygon) this.currentPolygon.draw(this.ctx);
        
        if (this.testPoint) {
            this.ctx.fillStyle = '#FF0000';
            this.ctx.beginPath();
            this.ctx.arc(this.testPoint.x, this.testPoint.y, 6, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    updateUI() {
        document.getElementById('completePolygon').disabled = !this.currentPolygon;
        document.getElementById('deleteLast').disabled = !this.currentPolygon || this.currentPolygon.vertices.length === 0;
        
        const checkBtn = document.getElementById('checkPoint');
        const edgeBtn = document.getElementById('checkEdge');
        
        checkBtn.style.background = this.checkMode ? '#B784A7' : 'transparent';
        checkBtn.style.color = this.checkMode ? 'white' : '#B784A7';
        edgeBtn.style.background = this.edgeCheckMode ? '#B784A7' : 'transparent';
        edgeBtn.style.color = this.edgeCheckMode ? 'white' : '#B784A7';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PolygonApp();
});