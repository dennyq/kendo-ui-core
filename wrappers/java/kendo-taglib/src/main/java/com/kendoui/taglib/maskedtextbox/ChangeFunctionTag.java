
package com.kendoui.taglib.maskedtextbox;

import com.kendoui.taglib.FunctionTag;

import com.kendoui.taglib.MaskedTextBoxTag;


import javax.servlet.jsp.JspException;

@SuppressWarnings("serial")
public class ChangeFunctionTag extends FunctionTag /* interfaces */ /* interfaces */ {
    
    @Override
    public int doEndTag() throws JspException {
//>> doEndTag


        MaskedTextBoxTag parent = (MaskedTextBoxTag)findParentWithClass(MaskedTextBoxTag.class);


        parent.setChange(this);

//<< doEndTag

        return super.doEndTag();
    }

    @Override
    public void initialize() {
//>> initialize
//<< initialize

        super.initialize();
    }

    @Override
    public void destroy() {
//>> destroy
//<< destroy

        super.destroy();
    }

//>> Attributes
//<< Attributes

}