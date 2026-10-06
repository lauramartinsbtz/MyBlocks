// Blocos preservados das categorias Controle, Lógica, Matemática e Variáveis.

Blockly.Blocks["inicio"] = {
  init: function() {
    this.appendDummyInput()
      .appendField("loop");
    this.appendStatementInput("DO");
    this.setColour("#d9d900");
    this.setTooltip("MyBlocks programming block.");
    this.setDeletable(true);
  }
};

Blockly.Blocks["logica_comparacao"] = {
  init: function() {
    this.appendValueInput("A")
      .setCheck("Number");
    this.appendDummyInput()
      .appendField(new Blockly.FieldDropdown([
        ["=", "EQ"],
        ["≠", "NEQ"],
        ["≥", "GTE"],
        ["≤", "LTE"],
        [">", "GT"],
        ["<", "LT"]
      ]), "OP");
    this.appendValueInput("B")
      .setCheck("Number");
    this.setInputsInline(true);
    this.setOutput(true, "Boolean");
    this.setColour("#4682B4");
    this.setTooltip("MyBlocks programming block.");
  }
};

Blockly.Blocks["repita_vezes"] = {
  init: function() {
    this.appendValueInput("TIMES")
      .setCheck("Number")
      .appendField("repeat");
    this.appendStatementInput("DO")
      .appendField("times");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour("#4682B4");
    this.setTooltip("MyBlocks programming block.");
  }
};

Blockly.Blocks["repita_enquanto"] = {
  init: function() {
    this.appendValueInput("COND").setCheck("Boolean").appendField("while");
    this.appendStatementInput("DO").appendField("do");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour("#4682B4");
    this.setTooltip("MyBlocks programming block.");
  }
};

Blockly.Blocks["para_variavel"] = {
  init: function() {
    this.appendValueInput("FROM").setCheck("Number")
      .appendField("count with")
      .appendField(new Blockly.FieldVariable("i"), "VAR")
      .appendField("from");
    this.appendValueInput("TO").setCheck("Number").appendField("to");
    this.appendValueInput("BY").setCheck("Number").appendField("by");
    this.appendStatementInput("DO").appendField("do");
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour("#39A853");
    this.setTooltip("MyBlocks programming block.");
  }
};

Blockly.Blocks["esperar_ms"] = {
  init: function() {
    this.appendDummyInput().appendField("delay")
      .appendField(new Blockly.FieldNumber(1000, 0, 2147483647, 1), "MS")
      .appendField("ms");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour("#d9d900");
    this.setTooltip("Wait for an integer number of milliseconds.");
  }
};

Blockly.Blocks["atribuir_inteiro"] = {
  init: function() {
    this.appendValueInput("VALUE")
      .setCheck("Number")
      .appendField("set")
      .appendField(new Blockly.FieldVariable("x"), "VAR")
      .appendField("to");

    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour("#C45A86");
    this.setTooltip("MyBlocks programming block.");
  }
};

Blockly.Blocks["variavel_valor"] = {
  init: function() {
    this.appendDummyInput()
      .appendField(new Blockly.FieldVariable("x"), "VAR");
    this.setOutput(true, "Number");
    this.setColour("#C45A86");
    this.setTooltip("MyBlocks programming block.");
  }
};


Blockly.Blocks["numero_inteiro"] = {
  init: function() {
    this.appendDummyInput()
      .appendField(new Blockly.FieldNumber(0, null, null, 0), "NUM");
    this.setOutput(true, "Number");
    this.setColour("#2F5DA8");
    this.setTooltip("MyBlocks programming block.");
  }
};

Blockly.Blocks["exibir_variavel"] = {
  init: function() {
    this.appendDummyInput()
      .appendField("print")
      .appendField(new Blockly.FieldVariable("x"), "VAR");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour("#C45A86");
    this.setTooltip("MyBlocks programming block.");
  }
};

Blockly.Blocks["digital_write"] = {
  init: function() {
    this.appendDummyInput().appendField("digitalWrite pin")
      .appendField(new Blockly.FieldNumber(2, 0, 48, 1), "PORT")
      .appendField("state")
      .appendField(new Blockly.FieldDropdown([["HIGH", "HIGH"], ["LOW", "LOW"]]), "STATE");
    this.setPreviousStatement(true); this.setNextStatement(true);
    this.setColour("#009943");
    this.setTooltip("MyBlocks programming block.");
  }
};
Blockly.Blocks["analog_write"] = {
  init: function() {
    this.appendDummyInput().appendField("analogWrite pin")
      .appendField(new Blockly.FieldNumber(2, 0, 48, 1), "PORT")
      .appendField("value")
      .appendField(new Blockly.FieldNumber(128, 0, 255, 1), "VALUE");
    this.setPreviousStatement(true); this.setNextStatement(true);
    this.setColour("#009943");
    this.setTooltip("MyBlocks programming block.");
  }
};

Blockly.Blocks["analog_read"] = {
  init: function() {
    this.appendDummyInput().appendField("analogRead pin")
      .appendField(new Blockly.FieldNumber(4, 0, 48, 1), "PORT");
    this.setOutput(true, "Number");
    this.setColour("#009943");
    this.setTooltip("Read the selected ADC GPIO. Connect this block to set x to.");
  }
};

Blockly.Blocks["servo_write"] = {
  init: function() {
    this.appendDummyInput().appendField("Servo pin")
      .appendField(new Blockly.FieldNumber(4, 0, 48, 1), "PORT")
      .appendField("angle")
      .appendField(new Blockly.FieldNumber(90, 0, 180, 1), "ANGLE");
    this.setPreviousStatement(true); this.setNextStatement(true);
    this.setColour("#009943");
    this.setTooltip("9g positional servo: 1–180 degrees; 0 disables the control signal.");
  }
};

Blockly.Blocks["temperatures"] = {
  init: function() {
    this.appendDummyInput().appendField("Temperatures pin")
      .appendField(new Blockly.FieldNumber(4, 0, 48, 1), "PORT")
      .appendField("°C");
    this.setOutput(true, "Number");
    this.setColour("#009943");
    this.setTooltip("Read the first DS18B20 on this GPIO in Celsius. Connect to set x to.");
  }
};
